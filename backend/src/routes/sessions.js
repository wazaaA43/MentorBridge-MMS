// Sessions (requested/confirmed/completed/cancelled/no_show), notes, actions, feedback.
const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { canView, canWrite, roleIn, scope } = require('../services/access');
const { toIso, findConflict } = require('../services/scheduling');
const { DISPLAY_STATUS } = require('../services/actions');

const SESSION_SELECT = `SELECT s.*, m.mentor_id, m.mentee_id, mu.name AS mentor_name, eu.name AS mentee_name
  FROM sessions s JOIN matches m ON m.id = s.match_id
  JOIN mentors mo ON mo.id = m.mentor_id JOIN users mu ON mu.id = mo.user_id
  JOIN mentees me ON me.id = m.mentee_id JOIN users eu ON eu.id = me.user_id`;

const TRANSITIONS = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const getSession = (id) => db.prepare(`${SESSION_SELECT} WHERE s.id = ?`).get(id);
const isPast = (iso) => new Date(iso).getTime() < Date.now();

router.get('/sessions', requireAuth, (req, res) => {
  const sc = scope(req.user);
  const { status, match_id } = req.query;
  const where = [sc.sql];
  const params = [...sc.params];
  if (status) { where.push('s.status = ?'); params.push(status); }
  if (match_id) { where.push('s.match_id = ?'); params.push(Number(match_id)); }
  res.json(db.prepare(`${SESSION_SELECT} WHERE ${where.join(' AND ')} ORDER BY s.start_at`).all(...params));
});

router.get('/sessions/:id', requireAuth, (req, res) => {
  const s = getSession(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (!canView(req.user, s)) return res.status(403).json({ error: 'Not your session' });
  const actions = db.prepare(`SELECT a.*, ${DISPLAY_STATUS} AS display_status FROM actions a WHERE a.session_id = ? ORDER BY a.due_date`).all(s.id);
  const feedback = db.prepare('SELECT * FROM feedback WHERE session_id = ?').all(s.id);
  res.json({ ...s, actions, feedback });
});

router.post('/sessions', requireAuth, (req, res) => {
  const { match_id, start_at, end_at, mode, focus } = req.body || {};
  const match = db.prepare("SELECT * FROM matches WHERE id = ? AND status = 'active'").get(Number(match_id));
  if (!match) return res.status(404).json({ error: 'Active match not found' });
  const role = roleIn(req.user, match);
  if (!role) return res.status(403).json({ error: 'You are not part of this match' });
  const start = toIso(start_at);
  const end = toIso(end_at);
  if (!start || !end) return res.status(400).json({ error: 'start_at and end_at must be valid date-times' });
  if (start >= end) return res.status(400).json({ error: 'end_at must be after start_at' });
  if (isPast(start)) return res.status(400).json({ error: 'Session must start in the future' });
  const conflict = findConflict({ matchId: match.id, startAt: start, endAt: end });
  if (conflict) return res.status(409).json({ error: 'double_booking', message: 'Mentor or mentee already has a session at that time', conflict });
  const status = role === 'mentee' ? 'requested' : 'confirmed';
  const info = db
    .prepare('INSERT INTO sessions (match_id, start_at, end_at, status, mode, focus) VALUES (?,?,?,?,?,?)')
    .run(match.id, start, end, status, mode || null, focus || null);
  res.status(201).json(getSession(info.lastInsertRowid));
});

router.put('/sessions/:id/reschedule', requireAuth, (req, res) => {
  const s = getSession(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const role = roleIn(req.user, s);
  if (!role) return res.status(403).json({ error: 'Not your session' });
  if (!['requested', 'confirmed'].includes(s.status)) return res.status(409).json({ error: `Cannot reschedule a ${s.status} session` });
  const start = toIso(req.body?.start_at);
  const end = toIso(req.body?.end_at);
  if (!start || !end || start >= end) return res.status(400).json({ error: 'Valid start_at and end_at are required' });
  if (isPast(start)) return res.status(400).json({ error: 'Session must start in the future' });
  const conflict = findConflict({ matchId: s.match_id, startAt: start, endAt: end, excludeSessionId: s.id });
  if (conflict) return res.status(409).json({ error: 'double_booking', conflict });
  // a mentee-initiated change needs the mentor to confirm again
  db.prepare('UPDATE sessions SET start_at = ?, end_at = ?, status = ? WHERE id = ?').run(start, end, role === 'mentee' ? 'requested' : s.status, s.id);
  res.json(getSession(s.id));
});

router.put('/sessions/:id/status', requireAuth, (req, res) => {
  const s = getSession(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const role = roleIn(req.user, s);
  if (!role) return res.status(403).json({ error: 'Not your session' });
  const next = req.body?.status;
  if (!Object.keys(TRANSITIONS).includes(next)) return res.status(400).json({ error: `status must be one of ${Object.keys(TRANSITIONS).join(', ')}` });
  if (!TRANSITIONS[s.status].includes(next)) return res.status(409).json({ error: `Cannot change a ${s.status} session to ${next}` });
  if (next !== 'cancelled' && role === 'mentee') return res.status(403).json({ error: 'Mentees can only cancel sessions' });
  if (next === 'completed') {
    const mins = s.duration_min ?? Math.round((new Date(s.end_at) - new Date(s.start_at)) / 60000);
    db.prepare("UPDATE sessions SET status = 'completed', attendance = 'attended', duration_min = ? WHERE id = ?").run(mins, s.id);
  } else if (next === 'no_show') {
    db.prepare("UPDATE sessions SET status = 'no_show', attendance = 'absent', duration_min = 0 WHERE id = ?").run(s.id);
  } else {
    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(next, s.id);
  }
  res.json(getSession(s.id));
});

router.put('/sessions/:id/notes', requireAuth, (req, res) => {
  const s = getSession(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const role = roleIn(req.user, s);
  if (role !== 'mentor' && role !== 'admin') return res.status(403).json({ error: 'Only the mentor (or an admin) can record session notes' });
  const b = req.body || {};
  if (b.attendance !== undefined && !['attended', 'absent'].includes(b.attendance)) return res.status(400).json({ error: 'attendance must be attended or absent' });
  if (b.duration_min !== undefined && !(Number.isInteger(b.duration_min) && b.duration_min >= 0)) return res.status(400).json({ error: 'duration_min must be a whole number >= 0' });
  if (b.follow_up_date && !DATE_RE.test(b.follow_up_date)) return res.status(400).json({ error: 'follow_up_date must be YYYY-MM-DD' });
  const sets = [];
  const vals = [];
  for (const f of ['attendance', 'duration_min', 'focus', 'guidance', 'follow_up_date']) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]); }
  }
  if (sets.length) db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...vals, s.id);
  res.json(getSession(s.id));
});

// ---------- Actions ----------
router.post('/sessions/:id/actions', requireAuth, (req, res) => {
  const s = getSession(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (!canWrite(req.user, s)) return res.status(403).json({ error: 'Not your session' });
  const { description, owner_role, due_date } = req.body || {};
  if (!description) return res.status(400).json({ error: 'description is required' });
  if (!['mentor', 'mentee'].includes(owner_role)) return res.status(400).json({ error: 'owner_role must be mentor or mentee' });
  if (!DATE_RE.test(due_date || '')) return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });
  const info = db.prepare('INSERT INTO actions (session_id, description, owner_role, due_date) VALUES (?,?,?,?)').run(s.id, description, owner_role, due_date);
  res.status(201).json(db.prepare(`SELECT a.*, ${DISPLAY_STATUS} AS display_status FROM actions a WHERE a.id = ?`).get(info.lastInsertRowid));
});

router.get('/actions', requireAuth, (req, res) => {
  const sc = scope(req.user);
  let rows = db
    .prepare(
      `SELECT a.*, ${DISPLAY_STATUS} AS display_status, s.match_id, m.mentor_id, m.mentee_id
         FROM actions a JOIN sessions s ON s.id = a.session_id JOIN matches m ON m.id = s.match_id
        WHERE ${sc.sql} ORDER BY a.due_date`
    )
    .all(...sc.params);
  if (req.query.status) rows = rows.filter((r) => r.display_status === req.query.status);
  res.json(rows);
});

router.put('/actions/:id', requireAuth, (req, res) => {
  const a = db
    .prepare('SELECT a.*, m.mentor_id, m.mentee_id FROM actions a JOIN sessions s ON s.id = a.session_id JOIN matches m ON m.id = s.match_id WHERE a.id = ?')
    .get(Number(req.params.id));
  if (!a) return res.status(404).json({ error: 'Action not found' });
  if (!canWrite(req.user, a)) return res.status(403).json({ error: 'Not your action' });
  const b = req.body || {};
  if (b.status !== undefined && !['open', 'in_progress', 'complete'].includes(b.status)) return res.status(400).json({ error: 'status must be open, in_progress or complete ("overdue" is calculated automatically)' });
  if (b.due_date !== undefined && !DATE_RE.test(b.due_date)) return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });
  const sets = [];
  const vals = [];
  for (const f of ['status', 'description', 'due_date']) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); vals.push(b[f]); }
  }
  if (b.status !== undefined) { sets.push('completed_at = ?'); vals.push(b.status === 'complete' ? new Date().toISOString() : null); }
  if (sets.length) db.prepare(`UPDATE actions SET ${sets.join(', ')} WHERE id = ?`).run(...vals, a.id);
  res.json(db.prepare(`SELECT a.*, ${DISPLAY_STATUS} AS display_status FROM actions a WHERE a.id = ?`).get(a.id));
});

// ---------- Feedback (structured, one per role per session) ----------
router.post('/sessions/:id/feedback', requireAuth, (req, res) => {
  const s = getSession(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const role = roleIn(req.user, s);
  if (role !== 'mentor' && role !== 'mentee') return res.status(403).json({ error: 'Only the mentor or mentee of this session can leave feedback' });
  if (s.status !== 'completed') return res.status(409).json({ error: 'Feedback can only be given on completed sessions' });
  const { rating, ratings, comments } = req.body || {};
  if (!(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'rating must be a whole number from 1 to 5' });
  if (db.prepare('SELECT 1 FROM feedback WHERE session_id = ? AND from_role = ?').get(s.id, role)) return res.status(409).json({ error: 'You have already given feedback for this session' });
  const info = db
    .prepare('INSERT INTO feedback (session_id, from_role, rating, ratings_json, comments) VALUES (?,?,?,?,?)')
    .run(s.id, role, rating, ratings ? JSON.stringify(ratings) : null, comments || null);
  res.status(201).json(db.prepare('SELECT * FROM feedback WHERE id = ?').get(info.lastInsertRowid));
});

module.exports = router;

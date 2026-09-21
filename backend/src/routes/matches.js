// Assignment, reassignment and capacity guard.
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadMentee, loadMentor, scoreMentor } = require('../services/matching');
const { capacityFor } = require('../services/capacity');
const { scope, canView, roleIn } = require('../services/access');

const MATCH_SELECT = `SELECT m.*, mu.name AS mentor_name, eu.name AS mentee_name
  FROM matches m
  JOIN mentors mo ON mo.id = m.mentor_id JOIN users mu ON mu.id = mo.user_id
  JOIN mentees me ON me.id = m.mentee_id JOIN users eu ON eu.id = me.user_id`;

const parse = (m) => ({ ...m, explanation: m.explanation ? JSON.parse(m.explanation) : null });

// Returns { status, body } so both POST and reassign can share the same rules.
function assign({ menteeId, mentorId, override, reason }) {
  const mentee = loadMentee(menteeId);
  const mentor = loadMentor(mentorId);
  if (!mentee) return { status: 404, body: { error: 'Mentee not found' } };
  if (!mentor) return { status: 404, body: { error: 'Mentor not found' } };
  if (mentor.status !== 'active') return { status: 409, body: { error: 'mentor_not_active', message: `Mentor is ${mentor.status}` } };
  if (db.prepare("SELECT 1 FROM matches WHERE mentee_id = ? AND status = 'active'").get(menteeId))
    return { status: 409, body: { error: 'mentee_already_matched', message: 'Use reassign to change this mentee\'s mentor' } };

  const cap = capacityFor(mentorId);
  if (cap.full && !override)
    return { status: 409, body: { error: 'capacity_reached', message: `${mentor.name} is at capacity (${cap.active}/${cap.capacity}). Send override=true with an override_reason to assign anyway.`, ...cap } };
  if (cap.full && override && !reason)
    return { status: 400, body: { error: 'override_reason is required when assigning beyond capacity' } };

  const result = scoreMentor(mentee, mentor);
  const info = db
    .prepare('INSERT INTO matches (mentee_id, mentor_id, score, explanation, override_reason) VALUES (?,?,?,?,?)')
    .run(menteeId, mentorId, result.score, JSON.stringify({ summary: result.summary, factors: result.factors }), cap.full ? reason : null);
  const match = parse(db.prepare(`${MATCH_SELECT} WHERE m.id = ?`).get(info.lastInsertRowid));
  const after = capacityFor(mentorId);
  const warning = cap.full
    ? `Over-allocated: ${after.active}/${after.capacity} (override recorded)`
    : after.full ? `${mentor.name} is now at capacity (${after.active}/${after.capacity})` : null;
  return { status: 201, body: { ...match, capacity: after, warning } };
}

router.get('/matches', requireAuth, (req, res) => {
  const sc = scope(req.user);
  const status = req.query.status;
  const rows = db
    .prepare(`${MATCH_SELECT} WHERE ${sc.sql}${status ? ' AND m.status = ?' : ''} ORDER BY m.assigned_at DESC`)
    .all(...sc.params, ...(status ? [status] : []));
  res.json(rows.map(parse));
});

router.get('/matches/:id', requireAuth, (req, res) => {
  const m = db.prepare(`${MATCH_SELECT} WHERE m.id = ?`).get(Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Match not found' });
  if (!canView(req.user, m)) return res.status(403).json({ error: 'Not your match' });
  const outcomes = db.prepare('SELECT * FROM outcomes WHERE match_id = ? ORDER BY achieved_on').all(m.id);
  res.json({ ...parse(m), outcomes });
});

router.post('/matches', requireAuth, requireRole('admin'), (req, res) => {
  const { mentee_id, mentor_id, override, override_reason } = req.body || {};
  if (!mentee_id || !mentor_id) return res.status(400).json({ error: 'mentee_id and mentor_id are required' });
  const r = assign({ menteeId: mentee_id, mentorId: mentor_id, override: !!override, reason: override_reason });
  res.status(r.status).json(r.body);
});

router.put('/matches/:id/reassign', requireAuth, requireRole('admin'), (req, res) => {
  const old = db.prepare("SELECT * FROM matches WHERE id = ? AND status = 'active'").get(Number(req.params.id));
  if (!old) return res.status(404).json({ error: 'Active match not found' });
  const { mentor_id, override, override_reason } = req.body || {};
  if (!mentor_id) return res.status(400).json({ error: 'mentor_id is required' });
  if (mentor_id === old.mentor_id) return res.status(400).json({ error: 'That mentor is already assigned' });
  const tx = db.transaction(() => {
    db.prepare("UPDATE matches SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(old.id);
    const r = assign({ menteeId: old.mentee_id, mentorId: mentor_id, override: !!override, reason: override_reason });
    if (r.status !== 201) throw r; // roll back so the old match stays active
    return r;
  });
  try {
    const r = tx();
    res.status(201).json({ ...r.body, replaced_match_id: old.id });
  } catch (e) {
    if (e && e.status && e.body) return res.status(e.status).json(e.body);
    throw e;
  }
});

router.put('/matches/:id/end', requireAuth, requireRole('admin'), (req, res) => {
  const info = db.prepare("UPDATE matches SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'").run(Number(req.params.id));
  info.changes ? res.json({ ended: true }) : res.status(404).json({ error: 'Active match not found' });
});

// ---------- Outcomes ----------
router.post('/matches/:id/outcomes', requireAuth, requireRole('mentor', 'admin'), (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(Number(req.params.id));
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (!roleIn(req.user, match)) return res.status(403).json({ error: 'Not your match' });
  const { description, category, achieved_on } = req.body || {};
  if (!description) return res.status(400).json({ error: 'description is required' });
  const info = db
    .prepare('INSERT INTO outcomes (match_id, description, category, achieved_on) VALUES (?,?,?,?)')
    .run(match.id, description, category || null, achieved_on || new Date().toISOString().slice(0, 10));
  res.status(201).json(db.prepare('SELECT * FROM outcomes WHERE id = ?').get(info.lastInsertRowid));
});

module.exports = router;

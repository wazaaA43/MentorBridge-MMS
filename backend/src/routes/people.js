// Mentor + mentee profiles, expertise tags, availability, and match recommendations.
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadMentee, loadMentor, recommend } = require('../services/matching');
const { capacityFor } = require('../services/capacity');
const { profileFor } = require('../services/access');

const bad = (res, msg) => res.status(400).json({ error: msg });
const toCsv = (v) => (Array.isArray(v) ? v.join(',') : v);

function setTags(table, col, id, names) {
  db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).run(id);
  const find = db.prepare('SELECT id FROM expertise_categories WHERE name = ?');
  const ins = db.prepare(`INSERT INTO ${table} (${col}, category_id) VALUES (?, ?)`);
  for (const n of names || []) {
    const c = find.get(n);
    if (c) ins.run(id, c.id);
  }
}

function setSlots(type, id, slots) {
  db.prepare('DELETE FROM availability_slots WHERE owner_type = ? AND owner_id = ?').run(type, id);
  const ins = db.prepare('INSERT INTO availability_slots (owner_type, owner_id, weekday, start_time, end_time) VALUES (?,?,?,?,?)');
  for (const s of slots || []) {
    if (!(s.weekday >= 0 && s.weekday <= 6) || !(s.start_time < s.end_time)) throw Object.assign(new Error('Invalid availability slot'), { status: 400 });
    ins.run(type, id, s.weekday, s.start_time, s.end_time);
  }
}

function updateRow(table, id, body, fields) {
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(toCsv(body[f]));
    }
  }
  if (sets.length) db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
}

const MENTOR_FIELDS = ['role_title', 'organisation', 'sector', 'years_experience', 'languages', 'modes', 'location', 'capacity', 'status', 'bio'];
const MENTEE_FIELDS = ['programme', 'interests', 'goals', 'languages', 'preferred_mode', 'location', 'status'];

function mentorView(id) {
  const m = loadMentor(id);
  if (!m) return null;
  const { activeCount, ...rest } = m;
  return { ...rest, availability: m.slots, ...capacityFor(id) };
}
function menteeView(id) {
  const m = loadMentee(id);
  if (!m) return null;
  const match = db
    .prepare("SELECT id, mentor_id FROM matches WHERE mentee_id = ? AND status = 'active'")
    .get(id);
  return { ...m, availability: m.slots, active_match: match || null };
}

// ---------- Mentors ----------
router.get('/mentors', requireAuth, (req, res) => {
  const { status, expertise, q } = req.query;
  let rows = db.prepare('SELECT id FROM mentors' + (status ? ' WHERE status = ?' : '')).all(...(status ? [status] : []));
  let out = rows.map((r) => mentorView(r.id));
  if (expertise) out = out.filter((m) => m.expertise.map((e) => e.toLowerCase()).includes(String(expertise).toLowerCase()));
  if (q) out = out.filter((m) => `${m.name} ${m.organisation} ${m.sector} ${m.role_title}`.toLowerCase().includes(String(q).toLowerCase()));
  res.json(out);
});

router.get('/mentors/:id', requireAuth, (req, res) => {
  const m = mentorView(Number(req.params.id));
  m ? res.json(m) : res.status(404).json({ error: 'Mentor not found' });
});

router.post('/mentors', requireAuth, requireRole('mentor', 'admin'), (req, res) => {
  const b = req.body || {};
  const userId = req.user.role === 'admin' ? b.user_id : req.user.id;
  if (!userId) return bad(res, 'user_id is required when an admin creates a profile');
  if (db.prepare('SELECT 1 FROM mentors WHERE user_id = ?').get(userId)) return res.status(409).json({ error: 'Mentor profile already exists' });
  if (!b.role_title || !b.organisation) return bad(res, 'role_title and organisation are required');
  if (b.capacity !== undefined && !(Number.isInteger(b.capacity) && b.capacity >= 0)) return bad(res, 'capacity must be a whole number >= 0');
  const info = db
    .prepare('INSERT INTO mentors (user_id, role_title, organisation, sector, years_experience, languages, modes, location, capacity, status, bio) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(userId, b.role_title, b.organisation, b.sector || null, b.years_experience || 0, toCsv(b.languages) || '', toCsv(b.modes) || 'online', b.location || null, b.capacity ?? 3, b.status || 'active', b.bio || null);
  const id = info.lastInsertRowid;
  setTags('mentor_expertise', 'mentor_id', id, b.expertise);
  setSlots('mentor', id, b.availability);
  res.status(201).json(mentorView(id));
});

router.put('/mentors/:id', requireAuth, requireRole('mentor', 'admin'), (req, res) => {
  const id = Number(req.params.id);
  const m = db.prepare('SELECT * FROM mentors WHERE id = ?').get(id);
  if (!m) return res.status(404).json({ error: 'Mentor not found' });
  if (req.user.role !== 'admin' && m.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own profile' });
  const b = req.body || {};
  if (b.capacity !== undefined) {
    if (!(Number.isInteger(b.capacity) && b.capacity >= 0)) return bad(res, 'capacity must be a whole number >= 0');
    const cap = capacityFor(id);
    if (b.capacity < cap.active) return res.status(409).json({ error: 'capacity_below_active', message: `Mentor already has ${cap.active} active mentees`, ...cap });
  }
  updateRow('mentors', id, b, MENTOR_FIELDS);
  if (b.expertise) setTags('mentor_expertise', 'mentor_id', id, b.expertise);
  if (b.availability) setSlots('mentor', id, b.availability);
  res.json(mentorView(id));
});

// ---------- Mentees ----------
router.get('/mentees', requireAuth, requireRole('admin', 'coach', 'mentor'), (req, res) => {
  const rows = db.prepare('SELECT id FROM mentees').all();
  res.json(rows.map((r) => menteeView(r.id)));
});

router.get('/mentees/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const mentee = menteeView(id);
  if (!mentee) return res.status(404).json({ error: 'Mentee not found' });
  if (req.user.role === 'mentee' && mentee.user_id !== req.user.id) return res.status(403).json({ error: 'Not your profile' });
  res.json(mentee);
});

router.post('/mentees', requireAuth, requireRole('mentee', 'admin'), (req, res) => {
  const b = req.body || {};
  const userId = req.user.role === 'admin' ? b.user_id : req.user.id;
  if (!userId) return bad(res, 'user_id is required when an admin creates a profile');
  if (db.prepare('SELECT 1 FROM mentees WHERE user_id = ?').get(userId)) return res.status(409).json({ error: 'Mentee profile already exists' });
  if (!b.programme) return bad(res, 'programme is required');
  const info = db
    .prepare('INSERT INTO mentees (user_id, programme, interests, goals, languages, preferred_mode, location) VALUES (?,?,?,?,?,?,?)')
    .run(userId, b.programme, b.interests || null, b.goals || null, toCsv(b.languages) || '', b.preferred_mode || 'either', b.location || null);
  const id = info.lastInsertRowid;
  setTags('mentee_needs', 'mentee_id', id, b.needs);
  setSlots('mentee', id, b.availability);
  res.status(201).json(menteeView(id));
});

router.put('/mentees/:id', requireAuth, requireRole('mentee', 'admin'), (req, res) => {
  const id = Number(req.params.id);
  const m = db.prepare('SELECT * FROM mentees WHERE id = ?').get(id);
  if (!m) return res.status(404).json({ error: 'Mentee not found' });
  if (req.user.role !== 'admin' && m.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own profile' });
  const b = req.body || {};
  updateRow('mentees', id, b, MENTEE_FIELDS);
  if (b.needs) setTags('mentee_needs', 'mentee_id', id, b.needs);
  if (b.availability) setSlots('mentee', id, b.availability);
  res.json(menteeView(id));
});

// ---------- Explainable recommendations ----------
router.get('/mentees/:id/recommendations', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const mentee = db.prepare('SELECT user_id FROM mentees WHERE id = ?').get(id);
  if (!mentee) return res.status(404).json({ error: 'Mentee not found' });
  if (req.user.role === 'mentee' && mentee.user_id !== req.user.id) return res.status(403).json({ error: 'Not your profile' });
  if (req.user.role === 'mentor') return res.status(403).json({ error: 'Not allowed for role "mentor"' });
  res.json(recommend(id, Number(req.query.limit) || 5));
});

router.get('/expertise-categories', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT id, name FROM expertise_categories ORDER BY name').all());
});

module.exports = router;

// Database loaders + recommendation on top of the pure scoring logic.
const db = require('../db');
const { scoreMentor } = require('./scoring');

const split = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

function slotsFor(type, id) {
  return db
    .prepare('SELECT weekday, start_time, end_time FROM availability_slots WHERE owner_type = ? AND owner_id = ? ORDER BY weekday, start_time')
    .all(type, id);
}

function loadMentee(id) {
  const m = db
    .prepare('SELECT me.*, u.name, u.email FROM mentees me JOIN users u ON u.id = me.user_id WHERE me.id = ?')
    .get(id);
  if (!m) return null;
  m.needs = db
    .prepare('SELECT c.name FROM mentee_needs n JOIN expertise_categories c ON c.id = n.category_id WHERE n.mentee_id = ?')
    .all(id)
    .map((r) => r.name);
  m.languages = split(m.languages);
  m.slots = slotsFor('mentee', id);
  return m;
}

function loadMentor(id) {
  const m = db
    .prepare('SELECT mo.*, u.name, u.email FROM mentors mo JOIN users u ON u.id = mo.user_id WHERE mo.id = ?')
    .get(id);
  if (!m) return null;
  m.expertise = db
    .prepare('SELECT c.name FROM mentor_expertise x JOIN expertise_categories c ON c.id = x.category_id WHERE x.mentor_id = ?')
    .all(id)
    .map((r) => r.name);
  m.languages = split(m.languages);
  m.modes = split(m.modes);
  m.slots = slotsFor('mentor', id);
  m.activeCount = db
    .prepare("SELECT COUNT(*) AS c FROM matches WHERE mentor_id = ? AND status = 'active'")
    .get(id).c;
  return m;
}

function recommend(menteeId, limit = 5) {
  const mentee = loadMentee(menteeId);
  if (!mentee) return null;
  const ids = db.prepare("SELECT id FROM mentors WHERE status = 'active'").all();
  const results = ids.map(({ id }) => {
    const mentor = loadMentor(id);
    const r = scoreMentor(mentee, mentor);
    return {
      mentor_id: mentor.id,
      name: mentor.name,
      role_title: mentor.role_title,
      organisation: mentor.organisation,
      sector: mentor.sector,
      location: mentor.location,
      expertise: mentor.expertise,
      capacity: mentor.capacity,
      active_mentees: mentor.activeCount,
      ...r,
    };
  });
  // mentors with room first, then by score
  results.sort((a, b) => Number(a.full) - Number(b.full) || b.score - a.score);
  return { mentee: { id: mentee.id, name: mentee.name, needs: mentee.needs }, recommendations: results.slice(0, limit) };
}

module.exports = { loadMentee, loadMentor, recommend, scoreMentor };

const db = require('../db');

// Capacity is always derived from active matches, so it can never drift out of sync.
function capacityFor(mentorId) {
  const m = db.prepare('SELECT capacity FROM mentors WHERE id = ?').get(mentorId);
  if (!m) return null;
  const active = db
    .prepare("SELECT COUNT(*) AS c FROM matches WHERE mentor_id = ? AND status = 'active'")
    .get(mentorId).c;
  return { capacity: m.capacity, active, remaining: Math.max(m.capacity - active, 0), full: active >= m.capacity };
}

module.exports = { capacityFor };

const db = require('../db');

function profileFor(user) {
  if (user.role === 'mentor') return db.prepare('SELECT id FROM mentors WHERE user_id = ?').get(user.id) || null;
  if (user.role === 'mentee') return db.prepare('SELECT id FROM mentees WHERE user_id = ?').get(user.id) || null;
  return null;
}

// row must contain mentor_id and mentee_id (a match, or a session joined to its match)
function roleIn(user, row) {
  if (user.role === 'admin') return 'admin';
  const p = profileFor(user);
  if (!p) return null;
  if (user.role === 'mentor' && row.mentor_id === p.id) return 'mentor';
  if (user.role === 'mentee' && row.mentee_id === p.id) return 'mentee';
  return null;
}

const canView = (user, row) => user.role === 'coach' || roleIn(user, row) !== null;
const canWrite = (user, row) => roleIn(user, row) !== null;

// SQL fragment limiting rows to what this user may see (alias "m" = matches)
function scope(user) {
  const p = profileFor(user);
  if (user.role === 'mentor') return { sql: 'm.mentor_id = ?', params: [p ? p.id : -1] };
  if (user.role === 'mentee') return { sql: 'm.mentee_id = ?', params: [p ? p.id : -1] };
  return { sql: '1 = 1', params: [] }; // admin, coach
}

module.exports = { profileFor, roleIn, canView, canWrite, scope };

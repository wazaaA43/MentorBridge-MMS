const db = require('../db');

function toIso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Double-booking check: same mentor OR same mentee, overlapping time, session still "live".
// Two ranges overlap when new.start < existing.end AND new.end > existing.start.
function findConflict({ matchId, startAt, endAt, excludeSessionId = 0 }) {
  const match = db.prepare('SELECT mentor_id, mentee_id FROM matches WHERE id = ?').get(matchId);
  if (!match) return null;
  return (
    db
      .prepare(
        `SELECT s.id, s.start_at, s.end_at, s.status
           FROM sessions s JOIN matches m ON m.id = s.match_id
          WHERE (m.mentor_id = ? OR m.mentee_id = ?)
            AND s.status IN ('requested','confirmed','completed')
            AND s.start_at < ? AND s.end_at > ? AND s.id != ?
          LIMIT 1`
      )
      .get(match.mentor_id, match.mentee_id, endAt, startAt, excludeSessionId) || null
  );
}

module.exports = { toIso, findConflict };

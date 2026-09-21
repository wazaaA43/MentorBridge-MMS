// Dashboards (requirement H): mentor, mentee and admin views + hours reporting.
// "Hours" = sum of duration_min on COMPLETED sessions. "Overdue" is computed from due dates.
const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { profileFor } = require('../services/access');
const { loadMentee } = require('../services/matching');
const { capacityFor } = require('../services/capacity');
const { DISPLAY_STATUS } = require('../services/actions');

const SESSION_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'];
const ACTION_STATUSES = ['open', 'in_progress', 'complete', 'overdue'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const hrs = (minutes) => Math.round(((minutes || 0) / 60) * 10) / 10;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const nowIso = () => new Date().toISOString();

function tally(rows, keys) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) out[r.k] = r.c;
  return out;
}

// w = SQL condition on matches alias "m"; p = its params
const sessionCounts = (w, p) =>
  tally(db.prepare(`SELECT s.status AS k, COUNT(*) AS c FROM sessions s JOIN matches m ON m.id = s.match_id WHERE ${w} GROUP BY s.status`).all(...p), SESSION_STATUSES);

const actionCounts = (w, p) =>
  tally(
    db.prepare(`SELECT ${DISPLAY_STATUS} AS k, COUNT(*) AS c FROM actions a JOIN sessions s ON s.id = a.session_id JOIN matches m ON m.id = s.match_id WHERE ${w} GROUP BY k`).all(...p),
    ACTION_STATUSES
  );

function hoursFor(w, p) {
  const d = new Date();
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const r = db
    .prepare(
      `SELECT COALESCE(SUM(s.duration_min),0) AS total,
              COALESCE(SUM(CASE WHEN s.start_at >= ? THEN s.duration_min ELSE 0 END),0) AS month,
              COUNT(*) AS n
         FROM sessions s JOIN matches m ON m.id = s.match_id
        WHERE s.status = 'completed' AND ${w}`
    )
    .get(monthStart, ...p);
  return { total_hours: hrs(r.total), this_month_hours: hrs(r.month), completed_sessions: r.n };
}

// Mentors/mentees see their own dashboard; admin/coach pass ?mentor_id= / ?mentee_id=
function resolveId(req, res, kind) {
  let id;
  if (req.user.role === kind) {
    const p = profileFor(req.user);
    if (!p) { res.status(404).json({ error: `No ${kind} profile yet` }); return null; }
    id = p.id;
  } else {
    id = Number(req.query[`${kind}_id`]);
    if (!id) { res.status(400).json({ error: `${kind}_id query parameter is required` }); return null; }
  }
  if (!db.prepare(`SELECT 1 FROM ${kind}s WHERE id = ?`).get(id)) { res.status(404).json({ error: `${kind} not found` }); return null; }
  return id;
}

// ---------------- Mentor dashboard ----------------
router.get('/dashboard/mentor', requireAuth, requireRole('mentor', 'admin', 'coach'), (req, res) => {
  const id = resolveId(req, res, 'mentor');
  if (!id) return;
  const mentor = db.prepare('SELECT mo.id, u.name, mo.role_title, mo.organisation, mo.status FROM mentors mo JOIN users u ON u.id = mo.user_id WHERE mo.id = ?').get(id);
  const now = nowIso();

  const mentees = db
    .prepare(
      `SELECT m.id AS match_id, me.id AS mentee_id, eu.name, me.programme, me.goals, m.score,
              (SELECT COUNT(*) FROM sessions s WHERE s.match_id = m.id AND s.status = 'completed') AS sessions_completed,
              (SELECT MIN(s.start_at) FROM sessions s WHERE s.match_id = m.id AND s.status IN ('requested','confirmed') AND s.start_at >= ?) AS next_session,
              (SELECT COUNT(*) FROM actions a JOIN sessions s ON s.id = a.session_id WHERE s.match_id = m.id AND ${DISPLAY_STATUS} != 'complete') AS open_actions
         FROM matches m JOIN mentees me ON me.id = m.mentee_id JOIN users eu ON eu.id = me.user_id
        WHERE m.mentor_id = ? AND m.status = 'active' ORDER BY eu.name`
    )
    .all(now, id);

  const upcoming = db
    .prepare(
      `SELECT s.id, s.start_at, s.end_at, s.status, s.mode, s.focus, eu.name AS mentee_name
         FROM sessions s JOIN matches m ON m.id = s.match_id JOIN mentees me ON me.id = m.mentee_id JOIN users eu ON eu.id = me.user_id
        WHERE m.mentor_id = ? AND s.status IN ('requested','confirmed') AND s.start_at >= ? ORDER BY s.start_at LIMIT 10`
    )
    .all(id, now);

  const overdueActions = db
    .prepare(
      `SELECT a.id, a.description, a.due_date, a.owner_role, eu.name AS mentee_name
         FROM actions a JOIN sessions s ON s.id = a.session_id JOIN matches m ON m.id = s.match_id
         JOIN mentees me ON me.id = m.mentee_id JOIN users eu ON eu.id = me.user_id
        WHERE m.mentor_id = ? AND ${DISPLAY_STATUS} = 'overdue' ORDER BY a.due_date`
    )
    .all(id);

  const fb = db
    .prepare("SELECT ROUND(AVG(f.rating),2) AS avg_rating, COUNT(*) AS count FROM feedback f JOIN sessions s ON s.id = f.session_id JOIN matches m ON m.id = s.match_id WHERE m.mentor_id = ? AND f.from_role = 'mentee'")
    .get(id);
  const outcomes = db.prepare('SELECT COUNT(*) AS c FROM outcomes o JOIN matches m ON m.id = o.match_id WHERE m.mentor_id = ?').get(id).c;

  res.json({
    mentor,
    capacity: capacityFor(id),
    mentees,
    sessions: { counts: sessionCounts('m.mentor_id = ?', [id]), upcoming },
    hours: hoursFor('m.mentor_id = ?', [id]),
    actions: { counts: actionCounts('m.mentor_id = ?', [id]), overdue: overdueActions },
    feedback_received: fb,
    outcomes_recorded: outcomes,
  });
});

// ---------------- Mentee dashboard ----------------
router.get('/dashboard/mentee', requireAuth, requireRole('mentee', 'admin', 'coach'), (req, res) => {
  const id = resolveId(req, res, 'mentee');
  if (!id) return;
  const mentee = loadMentee(id);
  const now = nowIso();

  const match = db
    .prepare(
      `SELECT m.id AS match_id, m.score, m.explanation, m.assigned_at, mo.id AS mentor_id, mu.name AS mentor_name, mo.role_title, mo.organisation, mo.sector
         FROM matches m JOIN mentors mo ON mo.id = m.mentor_id JOIN users mu ON mu.id = mo.user_id
        WHERE m.mentee_id = ? AND m.status = 'active'`
    )
    .get(id);
  if (match && match.explanation) match.explanation = JSON.parse(match.explanation);

  const upcoming = db
    .prepare(
      `SELECT s.id, s.start_at, s.end_at, s.status, s.mode, s.focus
         FROM sessions s JOIN matches m ON m.id = s.match_id
        WHERE m.mentee_id = ? AND s.status IN ('requested','confirmed') AND s.start_at >= ? ORDER BY s.start_at LIMIT 10`
    )
    .all(id, now);
  const recent = db
    .prepare(
      `SELECT s.id, s.start_at, s.duration_min, s.focus, s.guidance, s.follow_up_date
         FROM sessions s JOIN matches m ON m.id = s.match_id
        WHERE m.mentee_id = ? AND s.status = 'completed' ORDER BY s.start_at DESC LIMIT 5`
    )
    .all(id);
  const actions = db
    .prepare(
      `SELECT a.id, a.description, a.owner_role, a.due_date, a.status, ${DISPLAY_STATUS} AS display_status
         FROM actions a JOIN sessions s ON s.id = a.session_id JOIN matches m ON m.id = s.match_id
        WHERE m.mentee_id = ? ORDER BY (a.status = 'complete'), a.due_date`
    )
    .all(id);
  const outcomes = db.prepare('SELECT o.id, o.description, o.category, o.achieved_on FROM outcomes o JOIN matches m ON m.id = o.match_id WHERE m.mentee_id = ? ORDER BY o.achieved_on DESC').all(id);

  const counts = actionCounts('m.mentee_id = ?', [id]);
  const totalActions = Object.values(counts).reduce((a, b) => a + b, 0);
  const hours = hoursFor('m.mentee_id = ?', [id]);

  res.json({
    mentee: { id: mentee.id, name: mentee.name, programme: mentee.programme, goals: mentee.goals, interests: mentee.interests, needs: mentee.needs },
    mentor: match || null,
    message: match ? null : 'You have not been matched with a mentor yet.',
    sessions: { counts: sessionCounts('m.mentee_id = ?', [id]), upcoming, recent },
    actions: { counts, list: actions },
    progress: {
      sessions_completed: hours.completed_sessions,
      mentoring_hours: hours.total_hours,
      actions_total: totalActions,
      actions_completed: counts.complete,
      action_completion_pct: pct(counts.complete, totalActions),
      outcomes_achieved: outcomes.length,
    },
    outcomes,
  });
});

// ---------------- Admin dashboard ----------------
// Optional filters: ?from=YYYY-MM-DD&to=YYYY-MM-DD (applied to session dates: counts, hours, no-shows)
router.get('/dashboard/admin', requireAuth, requireRole('admin', 'coach'), (req, res) => {
  const { from, to } = req.query;
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
  const lo = from ? `${from}T00:00:00.000Z` : '0000-01-01';
  const hi = to ? `${to}T23:59:59.999Z` : '9999-12-31';
  const range = 's.start_at >= ? AND s.start_at <= ?';
  const rp = [lo, hi];
  const now = nowIso();

  const mentorStatus = tally(db.prepare('SELECT status AS k, COUNT(*) AS c FROM mentors GROUP BY status').all(), ['active', 'paused', 'inactive']);
  const totalMentees = db.prepare('SELECT COUNT(*) AS c FROM mentees').get().c;
  const matchedMentees = db.prepare("SELECT COUNT(DISTINCT mentee_id) AS c FROM matches WHERE status = 'active'").get().c;
  const activeMatches = db.prepare("SELECT COUNT(*) AS c FROM matches WHERE status = 'active'").get().c;

  const sessionsByStatus = tally(
    db.prepare(`SELECT s.status AS k, COUNT(*) AS c FROM sessions s WHERE ${range} GROUP BY s.status`).all(...rp),
    SESSION_STATUSES
  );
  const totalMinutes = db.prepare(`SELECT COALESCE(SUM(s.duration_min),0) AS m FROM sessions s WHERE s.status = 'completed' AND ${range}`).get(...rp).m;
  const hoursByMonth = db
    .prepare(`SELECT substr(s.start_at,1,7) AS month, SUM(s.duration_min) AS minutes, COUNT(*) AS sessions FROM sessions s WHERE s.status = 'completed' AND ${range} GROUP BY month ORDER BY month`)
    .all(...rp)
    .map((r) => ({ month: r.month, hours: hrs(r.minutes), sessions: r.sessions }));

  const perMentor = db
    .prepare(
      `SELECT mo.id AS mentor_id, u.name, mo.capacity, mo.status,
              (SELECT COUNT(*) FROM matches x WHERE x.mentor_id = mo.id AND x.status = 'active') AS active_mentees,
              COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.duration_min END),0) AS minutes,
              COALESCE(SUM(s.status = 'completed'),0) AS completed_sessions,
              COALESCE(SUM(s.status = 'no_show'),0) AS no_shows
         FROM mentors mo JOIN users u ON u.id = mo.user_id
         LEFT JOIN matches m ON m.mentor_id = mo.id
         LEFT JOIN sessions s ON s.match_id = m.id AND ${range}
        GROUP BY mo.id ORDER BY minutes DESC, u.name`
    )
    .all(...rp)
    .map((r) => ({
      mentor_id: r.mentor_id, name: r.name, status: r.status, capacity: r.capacity, active_mentees: r.active_mentees,
      remaining: Math.max(r.capacity - r.active_mentees, 0), full: r.active_mentees >= r.capacity,
      hours: hrs(r.minutes), completed_sessions: r.completed_sessions, no_shows: r.no_shows,
    }));

  const expertise = db
    .prepare(
      `SELECT c.name AS category,
              (SELECT COUNT(*) FROM mentee_needs n WHERE n.category_id = c.id) AS requested,
              (SELECT COUNT(*) FROM mentee_needs n JOIN mentees me ON me.id = n.mentee_id
                WHERE n.category_id = c.id AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.mentee_id = me.id AND m.status = 'active')) AS requested_by_unmatched,
              (SELECT COUNT(*) FROM mentor_expertise x JOIN mentors mo ON mo.id = x.mentor_id WHERE x.category_id = c.id AND mo.status = 'active') AS mentors_offering
         FROM expertise_categories c ORDER BY requested DESC, c.name`
    )
    .all();

  const feedback = db.prepare('SELECT from_role, ROUND(AVG(rating),2) AS avg_rating, COUNT(*) AS count FROM feedback GROUP BY from_role').all();

  const unmatched = db
    .prepare("SELECT me.id AS mentee_id, u.name, me.programme FROM mentees me JOIN users u ON u.id = me.user_id WHERE me.status = 'active' AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.mentee_id = me.id AND m.status = 'active') ORDER BY u.name")
    .all();

  // Relationships that may be stalling: no completed session in 30 days and nothing upcoming
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const stalled = db
    .prepare(
      `SELECT m.id AS match_id, mu.name AS mentor_name, eu.name AS mentee_name,
              MAX(CASE WHEN s.status = 'completed' THEN s.start_at END) AS last_completed_session
         FROM matches m JOIN mentors mo ON mo.id = m.mentor_id JOIN users mu ON mu.id = mo.user_id
         JOIN mentees me ON me.id = m.mentee_id JOIN users eu ON eu.id = me.user_id
         LEFT JOIN sessions s ON s.match_id = m.id
        WHERE m.status = 'active'
        GROUP BY m.id
       HAVING (last_completed_session IS NULL OR last_completed_session < ?)
          AND SUM(CASE WHEN s.status IN ('requested','confirmed') AND s.start_at >= ? THEN 1 ELSE 0 END) = 0`
    )
    .all(cutoff, now);

  res.json({
    filters: { from: from || null, to: to || null },
    totals: {
      mentors: { total: mentorStatus.active + mentorStatus.paused + mentorStatus.inactive, ...mentorStatus },
      mentees: { total: totalMentees, matched: matchedMentees, unmatched: totalMentees - matchedMentees },
      active_matches: activeMatches,
      mentors_at_capacity: perMentor.filter((m) => m.full && m.status === 'active').length,
    },
    sessions: {
      counts: sessionsByStatus,
      total: Object.values(sessionsByStatus).reduce((a, b) => a + b, 0),
      no_show_rate_pct: pct(sessionsByStatus.no_show, sessionsByStatus.completed + sessionsByStatus.no_show),
    },
    hours: { total_hours: hrs(totalMinutes), by_month: hoursByMonth },
    mentors: perMentor,
    requested_expertise: expertise,
    actions: actionCounts('1 = 1', []),
    feedback_averages: feedback,
    attention: { unmatched_mentees: unmatched, stalled_matches: stalled },
  });
});

module.exports = router;

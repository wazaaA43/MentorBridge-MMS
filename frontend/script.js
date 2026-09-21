/* ============================================================
   MENTORBRIDGE — DATA LAYER
   All data below is served through the `API` object at the
   bottom of this section. Every API function returns a Promise
   (simulated network delay) so that swapping this mock layer for
   real fetch() calls to a backend later requires no changes to
   any render/event code elsewhere in this file.
   ============================================================ */

const EXPERTISE_CATEGORIES = [
  "Software Engineering",
  "Product Management",
  "Data & Analytics",
  "UX/UI Design",
  "Entrepreneurship & Funding",
  "Marketing & Growth",
  "Finance & Accounting",
  "Leadership & People Management"
];

const MODES = ["Virtual", "In-person", "Hybrid"];
const LANGUAGES = ["English", "Setswana", "isiZulu", "Sesotho", "Afrikaans"];

/* ---------- MENTORS (10) ---------- */
const mentors = [
  { id: "M1", name: "Phenyo Nkhumane", role: "Senior Software Developer", org: "Kasi Cloud", sector: "Technology", experienceYears: 9, expertise: ["Software Engineering", "Leadership & People Management"], language: "English", mode: "Virtual", availability: ["Mon 17:00-19:00", "Wed 17:00-19:00"], capacity: 5, status: "Active" },
  { id: "M2", name: "Dr. Tabitha Kiabilua", role: "Database Architect", org: "Data Horizon Labs", sector: "Technology", experienceYears: 12, expertise: ["Data & Analytics", "Software Engineering"], language: "English", mode: "Hybrid", availability: ["Tue 16:00-18:00"], capacity: 3, status: "Active" },
  { id: "M3", name: "Lesedi Mabaso", role: "Product Lead", org: "Naledi Fintech", sector: "Financial Services", experienceYears: 8, expertise: ["Product Management", "Data & Analytics"], language: "isiZulu", mode: "Virtual", availability: ["Mon 09:00-11:00", "Thu 09:00-11:00"], capacity: 4, status: "Active" },
  { id: "M4", name: "Karabo Seetso", role: "Founder & CEO", org: "Seetso Ventures", sector: "Entrepreneurship", experienceYears: 14, expertise: ["Entrepreneurship & Funding", "Leadership & People Management"], language: "Setswana", mode: "In-person", availability: ["Fri 14:00-16:00"], capacity: 3, status: "Active" },
  { id: "M5", name: "Naledi Phasha", role: "Head of Design", org: "Orbit Studio", sector: "Design", experienceYears: 10, expertise: ["UX/UI Design", "Product Management"], language: "English", mode: "Hybrid", availability: ["Wed 13:00-15:00"], capacity: 4, status: "Active" },
  { id: "M6", name: "Thabo Ramafalo", role: "Growth Marketing Manager", org: "Bloom Collective", sector: "Marketing", experienceYears: 7, expertise: ["Marketing & Growth", "Entrepreneurship & Funding"], language: "Sesotho", mode: "Virtual", availability: ["Tue 18:00-20:00", "Thu 18:00-20:00"], capacity: 6, status: "Active" },
  { id: "M7", name: "Zanele Mokoena", role: "Chief Financial Officer", org: "Vantage Capital Group", sector: "Financial Services", experienceYears: 15, expertise: ["Finance & Accounting", "Leadership & People Management"], language: "English", mode: "Virtual", availability: ["Mon 12:00-14:00"], capacity: 3, status: "Active" },
  { id: "M8", name: "Sipho Ndlovu", role: "Engineering Manager", org: "Quantum Byte", sector: "Technology", experienceYears: 11, expertise: ["Software Engineering", "Product Management"], language: "isiZulu", mode: "Hybrid", availability: ["Wed 17:00-19:00", "Fri 17:00-19:00"], capacity: 5, status: "On Leave" },
  { id: "M9", name: "Rethabile Moloi", role: "Data Science Lead", org: "Insight Africa", sector: "Technology", experienceYears: 9, expertise: ["Data & Analytics", "UX/UI Design"], language: "Afrikaans", mode: "Virtual", availability: ["Thu 15:00-17:00"], capacity: 4, status: "Active" },
  { id: "M10", name: "Given Mahlangu", role: "People & Culture Director", org: "Horizon Group", sector: "Human Capital", experienceYears: 13, expertise: ["Leadership & People Management", "Marketing & Growth"], language: "English", mode: "In-person", availability: ["Tue 10:00-12:00"], capacity: 4, status: "Active" }
];

/* ---------- MENTEES (20) ---------- */
const menteeFirst = ["Amogelang","Boitumelo","Cebo","Dineo","Ernest","Fikile","Gontse","Hlengiwe","Itumeleng","Junior","Katlego","Lerato","Mmabatho","Nkosana","Onalenna","Palesa","Qhawe","Refilwe","Siyabonga","Tumelo"];
const menteeLast = ["Mahlangu","Dube","Sithole","Radebe","Molefe","Khumalo","Sebeko","Ntuli","Mokgatle","Ngwenya","Zulu","Pheko","Tau","Maluleke","Chauke","Nyathi","Sekgobela","Buthelezi","Modise","Mahlaba"];
const programmes = ["Graduate Track", "Founders Sprint", "Early-Career Bootcamp", "Returning-to-Work Programme"];
const supportAreas = ["Technical skills", "Career direction", "Confidence & communication", "Fundraising readiness", "Portfolio & craft feedback", "Financial literacy"];

function buildMentees() {
  const list = [];
  for (let i = 0; i < 20; i++) {
    const first = menteeFirst[i];
    const last = menteeLast[i];
    // Rotate through expertise categories so every category is requested by someone
    const primaryInterest = EXPERTISE_CATEGORIES[i % EXPERTISE_CATEGORIES.length];
    const secondaryInterest = EXPERTISE_CATEGORIES[(i + 3) % EXPERTISE_CATEGORIES.length];
    list.push({
      id: "N" + (i + 1),
      name: first + " " + last,
      programme: programmes[i % programmes.length],
      interests: [primaryInterest, secondaryInterest],
      goals: "Grow into a confident, independent " + primaryInterest.split(" ")[0].toLowerCase() + " practitioner within 6 months.",
      supportAreas: [supportAreas[i % supportAreas.length], supportAreas[(i + 2) % supportAreas.length]],
      mode: MODES[i % MODES.length],
      language: LANGUAGES[i % LANGUAGES.length],
      availability: ["Mon 17:00-19:00", "Wed 17:00-19:00", "Thu 09:00-11:00", "Tue 18:00-20:00", "Fri 14:00-16:00"][i % 5]
    });
  }
  return list;
}
const mentees = buildMentees();

/* ---------- MATCHING ENGINE ----------
   Weighted rules-based score, as recommended in the brief.
   Returns a score (0-100) and an explainable reasons array. */
function computeMatch(mentee, mentor) {
  let score = 0;
  const reasons = [];

  const sharedExpertise = mentor.expertise.filter(e => mentee.interests.includes(e));
  if (sharedExpertise.length > 0) {
    score += sharedExpertise.length * 30;
    reasons.push("Matches " + sharedExpertise.length + " development area" + (sharedExpertise.length > 1 ? "s" : "") + " (" + sharedExpertise.join(", ") + ")");
  }

  if (mentor.mode === mentee.mode || mentor.mode === "Hybrid") {
    score += 15;
    reasons.push("Compatible session mode (" + mentor.mode + ")");
  }

  if (mentor.language === mentee.language) {
    score += 10;
    reasons.push("Shared language (" + mentor.language + ")");
  }

  const overlapsAvailability = mentor.availability.some(slot => slot.split(" ")[0] === mentee.availability.split(" ")[0]);
  if (overlapsAvailability) {
    score += 15;
    reasons.push("Overlapping weekly availability");
  }

  const remainingCapacity = mentor.capacity - assignedCountFor(mentor.id);
  if (remainingCapacity > 0) {
    score += 10;
    reasons.push(remainingCapacity + " of " + mentor.capacity + " capacity slots still open");
  } else {
    reasons.push("Mentor is currently at full capacity");
  }

  if (mentor.status !== "Active") {
    score = Math.max(0, score - 40);
    reasons.push("Mentor is currently " + mentor.status.toLowerCase());
  }

  return { score: Math.min(100, score), reasons, remainingCapacity };
}

function assignedCountFor(mentorId) {
  return matches.filter(m => m.mentorId === mentorId && m.status === "Active").length;
}

/* ---------- MATCHES / ASSIGNMENTS (10 active) ---------- */
const matches = [
  { id: "A1", menteeId: "N1", mentorId: "M1", status: "Active" },
  { id: "A2", menteeId: "N2", mentorId: "M2", status: "Active" },
  { id: "A3", menteeId: "N3", mentorId: "M3", status: "Active" },
  { id: "A4", menteeId: "N4", mentorId: "M4", status: "Active" },
  { id: "A5", menteeId: "N5", mentorId: "M5", status: "Active" },
  { id: "A6", menteeId: "N6", mentorId: "M6", status: "Active" },
  { id: "A7", menteeId: "N7", mentorId: "M7", status: "Active" },
  { id: "A8", menteeId: "N9", mentorId: "M9", status: "Active" },
  { id: "A9", menteeId: "N10", mentorId: "M10", status: "Active" },
  { id: "A10", menteeId: "N13", mentorId: "M1", status: "Active" }
];

/* ---------- SESSIONS ----------
   18 total booked sessions: 10 completed (with notes/actions/
   feedback attached), 3 confirmed, 2 requested, 2 cancelled,
   1 no-show — satisfying both the "15 booked" and
   "10 completed" minimums in the brief. */
const sessionFocuses = ["Goal-setting & roadmap", "Technical deep dive", "Mock interview practice", "Portfolio review", "Pitch deck feedback", "Career pathing", "Financial modelling review", "Leadership check-in", "Networking strategy", "Progress review"];

const sessions = [];
let sIdCounter = 1;
function addSession(matchIndex, status, daysOffset, focus) {
  const match = matches[matchIndex % matches.length];
  sessions.push({
    id: "S" + sIdCounter++,
    matchId: match.id,
    menteeId: match.menteeId,
    mentorId: match.mentorId,
    status,
    date: relativeDate(daysOffset),
    focus,
    durationMins: status === "Completed" ? [45, 60, 60, 30, 45][sIdCounter % 5] : null
  });
}
function relativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
// 10 completed (past)
for (let i = 0; i < 10; i++) addSession(i, "Completed", -(3 + i * 4), sessionFocuses[i]);
// 3 confirmed (future)
for (let i = 0; i < 3; i++) addSession(i, "Confirmed", 3 + i * 2, sessionFocuses[i]);
// 2 requested (future, awaiting mentor confirmation)
for (let i = 3; i < 5; i++) addSession(i, "Requested", 5 + i, sessionFocuses[i]);
// 2 cancelled
for (let i = 5; i < 7; i++) addSession(i, "Cancelled", 6 + i, sessionFocuses[i]);
// 1 no-show
addSession(7, "No-show", -2, sessionFocuses[7]);

const completedSessions = sessions.filter(s => s.status === "Completed");

/* ---------- SESSION NOTES (1 per completed session = 10) ---------- */
const sessionNotes = completedSessions.map((s, i) => ({
  id: "SN" + (i + 1),
  sessionId: s.id,
  guidance: "Discussed " + s.focus.toLowerCase() + " and agreed on concrete next steps to build momentum before the next session.",
  followUpDate: relativeDate(7 + i * 2)
}));

/* ---------- ACTION ITEMS (15, tied to session notes) ---------- */
const actionTemplates = ["Complete a practice exercise and share results", "Update CV / portfolio with recent work", "Research 3 relevant opportunities", "Draft a one-page plan and send for review", "Schedule a follow-up practice session", "Read the recommended resource and note key takeaways"];
const actionStatuses = ["Open", "In Progress", "Complete", "Overdue"];
const actions = [];
let actIdCounter = 1;
sessionNotes.forEach((note, i) => {
  const count = i % 3 === 0 ? 2 : 1; // some sessions produce 2 actions -> reaches 15 total
  for (let j = 0; j < count && actions.length < 15; j++) {
    actions.push({
      id: "AC" + actIdCounter++,
      sessionId: note.sessionId,
      menteeId: sessions.find(s => s.id === note.sessionId).menteeId,
      description: actionTemplates[(i + j) % actionTemplates.length],
      dueDate: note.followUpDate,
      status: actionStatuses[(i + j) % actionStatuses.length]
    });
  }
});

/* ---------- FEEDBACK & OUTCOMES (10 mentor + 10 mentee) ---------- */
const outcomeTemplates = ["Increased confidence approaching " , "Demonstrated measurable progress in ", "Successfully applied new techniques in ", "Built a clear personal plan for "];
const mentorFeedback = completedSessions.map((s, i) => ({
  id: "MF" + (i + 1),
  sessionId: s.id,
  rating: [4, 5, 5, 3, 4, 5, 4, 5, 4, 5][i],
  comment: "Mentee came prepared and engaged well with the " + s.focus.toLowerCase() + " discussion.",
  outcome: outcomeTemplates[i % outcomeTemplates.length] + s.focus.toLowerCase()
}));
const menteeFeedback = completedSessions.map((s, i) => ({
  id: "EF" + (i + 1),
  sessionId: s.id,
  rating: [5, 4, 5, 4, 5, 5, 4, 4, 5, 4][i],
  comment: "The session on " + s.focus.toLowerCase() + " was practical and directly useful."
}));

/* ---------- HELPERS ---------- */
function findMentor(id) { return mentors.find(m => m.id === id); }
function findMentee(id) { return mentees.find(n => n.id === id); }
function findSession(id) { return sessions.find(s => s.id === id); }

function hasDoubleBooking(mentorId, date) {
  return sessions.some(s => s.mentorId === mentorId && s.date === date && (s.status === "Confirmed" || s.status === "Requested"));
}

function mentorHours(mentorId) {
  return sessions
    .filter(s => s.mentorId === mentorId && s.status === "Completed")
    .reduce((sum, s) => sum + (s.durationMins || 0), 0) / 60;
}

/* ---------- MOCK API ----------
   Every call is wrapped in a Promise with a short simulated
   delay, mirroring the shape a real backend call would have.
   Swap the resolve(...) payloads for fetch() calls when the
   real API is ready — the render layer doesn't need to change. */
const NETWORK_DELAY = 120;
function apiCall(payload) {
  return new Promise(resolve => setTimeout(() => resolve(payload), NETWORK_DELAY));
}

const API = {
  getMentors: () => apiCall(mentors),
  getMentees: () => apiCall(mentees),
  getMentor: id => apiCall(findMentor(id)),
  getMentee: id => apiCall(findMentee(id)),
  getMatchesForMentee: menteeId => apiCall(
    mentors.map(mentor => ({ mentor, ...computeMatch(findMentee(menteeId), mentor) }))
      .sort((a, b) => b.score - a.score)
  ),
  getMatchesForMentor: mentorId => apiCall(matches.filter(m => m.mentorId === mentorId && m.status === "Active").map(m => findMentee(m.menteeId))),
  getSessionsForMentor: mentorId => apiCall(sessions.filter(s => s.mentorId === mentorId)),
  getSessionsForMentee: menteeId => apiCall(sessions.filter(s => s.menteeId === menteeId)),
  getActionsForMentee: menteeId => apiCall(actions.filter(a => a.menteeId === menteeId)),

  createSession: (menteeId, mentorId, date, focus) => {
    if (hasDoubleBooking(mentorId, date)) {
      return apiCall({ error: "This mentor already has a session booked on that date. Choose another slot to avoid a double-booking." });
    }
    const match = matches.find(m => m.menteeId === menteeId && m.mentorId === mentorId && m.status === "Active");
    const newSession = { id: "S" + (sessions.length + 1 + Math.floor(Math.random() * 1000)), matchId: match ? match.id : null, menteeId, mentorId, status: "Requested", date, focus, durationMins: null };
    sessions.push(newSession);
    return apiCall(newSession);
  },

  updateSessionStatus: (sessionId, status) => {
    const s = findSession(sessionId);
    if (s) s.status = status;
    return apiCall(s);
  },

  logSessionOutcome: (sessionId, data) => {
    const s = findSession(sessionId);
    if (!s) return apiCall({ error: "Session not found" });
    s.status = "Completed";
    s.durationMins = data.durationMins;
    sessionNotes.push({ id: "SN" + (sessionNotes.length + 1), sessionId, guidance: data.guidance, followUpDate: data.followUpDate });
    if (data.actionDescription) {
      actions.push({ id: "AC" + (actions.length + 1), sessionId, menteeId: s.menteeId, description: data.actionDescription, dueDate: data.followUpDate, status: "Open" });
    }
    return apiCall(s);
  },

  submitMentorFeedback: (sessionId, rating, comment, outcome) => {
    mentorFeedback.push({ id: "MF" + (mentorFeedback.length + 1), sessionId, rating, comment, outcome });
    return apiCall({ ok: true });
  },
  submitMenteeFeedback: (sessionId, rating, comment) => {
    menteeFeedback.push({ id: "EF" + (menteeFeedback.length + 1), sessionId, rating, comment });
    return apiCall({ ok: true });
  },

  assignMentor: (menteeId, mentorId) => {
    const mentor = findMentor(mentorId);
    if (assignedCountFor(mentorId) >= mentor.capacity) {
      return apiCall({ error: "Cannot assign — " + mentor.name + " is already at full capacity (" + mentor.capacity + "/" + mentor.capacity + ")." });
    }
    const existing = matches.find(m => m.menteeId === menteeId && m.status === "Active");
    if (existing) existing.status = "Reassigned";
    matches.push({ id: "A" + (matches.length + 1), menteeId, mentorId, status: "Active" });
    return apiCall({ ok: true });
  },

  getAdminStats: () => {
    const totalHours = sessions.filter(s => s.status === "Completed").reduce((sum, s) => sum + (s.durationMins || 0), 0) / 60;
    const noShows = sessions.filter(s => s.status === "No-show").length;
    const activeMatches = matches.filter(m => m.status === "Active").length;
    const requestedExpertiseCounts = {};
    EXPERTISE_CATEGORIES.forEach(cat => requestedExpertiseCounts[cat] = 0);
    mentees.forEach(n => n.interests.forEach(i => requestedExpertiseCounts[i]++));
    return apiCall({
      totalMentors: mentors.length,
      totalMentees: mentees.length,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalHours: Math.round(totalHours * 10) / 10,
      noShows,
      activeMatches,
      requestedExpertiseCounts,
      mentorsAtCapacity: mentors.filter(m => assignedCountFor(m.id) >= m.capacity).length
    });
  }
};
// Pure matching logic (no database access) so it is easy to test and explain.
// Score is out of 100. Every factor returns points AND a plain-language reason.

const WEIGHTS = { expertise: 40, availability: 20, language: 15, mode: 10, capacity: 15 };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const lower = (a) => (a || []).map((x) => String(x).toLowerCase());

function slotsOverlap(a, b) {
  return a.weekday === b.weekday && a.start_time < b.end_time && b.start_time < a.end_time;
}

function scoreMentor(mentee, mentor) {
  const factors = [];

  // 1. Expertise vs development needs
  const needs = mentee.needs || [];
  const have = lower(mentor.expertise);
  const sharedNeeds = needs.filter((n) => have.includes(n.toLowerCase()));
  factors.push({
    factor: 'expertise',
    points: needs.length ? Math.round((sharedNeeds.length / needs.length) * WEIGHTS.expertise) : 0,
    max: WEIGHTS.expertise,
    detail: sharedNeeds.length
      ? `Covers ${sharedNeeds.join(', ')} (${sharedNeeds.length} of ${needs.length} support areas)`
      : 'No overlap with the requested support areas',
  });

  // 2. Availability overlap (share of the mentee's slots the mentor can also do)
  const menteeSlots = mentee.slots || [];
  const mentorSlots = mentor.slots || [];
  const overlapping = menteeSlots.filter((s) => mentorSlots.some((o) => slotsOverlap(s, o)));
  const days = [...new Set(overlapping.map((s) => DAYS[s.weekday]))];
  factors.push({
    factor: 'availability',
    points: menteeSlots.length ? Math.round((overlapping.length / menteeSlots.length) * WEIGHTS.availability) : 0,
    max: WEIGHTS.availability,
    detail: overlapping.length ? `Both free on ${days.join(', ')}` : 'No overlapping availability',
  });

  // 3. Language
  const menteeLangs = lower(mentee.languages);
  const sharedLangs = (mentor.languages || []).filter((l) => menteeLangs.includes(l.toLowerCase()));
  factors.push({
    factor: 'language',
    points: sharedLangs.length ? WEIGHTS.language : 0,
    max: WEIGHTS.language,
    detail: sharedLangs.length ? `Shared language: ${sharedLangs.join(', ')}` : 'No shared language',
  });

  // 4. Mode (online / in-person) and location
  const pref = mentee.preferred_mode || 'either';
  const modes = lower(mentor.modes);
  const sameCity =
    mentee.location && mentor.location && mentee.location.toLowerCase() === mentor.location.toLowerCase();
  let modePts = 0;
  let modeDetail;
  if (pref === 'either') {
    modePts = modes.length ? WEIGHTS.mode : 0;
    modeDetail = modes.length ? 'Mentee is flexible on mode' : 'Mentor has no mode set';
  } else if (pref === 'online') {
    modePts = modes.includes('online') ? WEIGHTS.mode : 0;
    modeDetail = modePts ? 'Mentor offers online sessions' : 'Mentor does not offer online sessions';
  } else if (modes.includes('in-person')) {
    modePts = sameCity ? WEIGHTS.mode : 4;
    modeDetail = sameCity
      ? `In-person possible in ${mentor.location}`
      : `Offers in-person but is based in ${mentor.location || 'a different location'}`;
  } else {
    modeDetail = 'Mentee wants in-person; mentor is online only';
  }
  factors.push({ factor: 'mode', points: modePts, max: WEIGHTS.mode, detail: modeDetail });

  // 5. Remaining capacity
  const capacity = mentor.capacity || 0;
  const active = mentor.activeCount || 0;
  const remaining = Math.max(capacity - active, 0);
  const full = remaining === 0;
  factors.push({
    factor: 'capacity',
    points: full || !capacity ? 0 : Math.round((remaining / capacity) * WEIGHTS.capacity),
    max: WEIGHTS.capacity,
    detail: full ? `At capacity (${active}/${capacity} mentees)` : `${remaining} of ${capacity} places free`,
  });

  const score = factors.reduce((sum, f) => sum + f.points, 0);
  const reasons = factors
    .filter((f) => f.points > 0 && f.factor !== 'capacity')
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((f) => f.detail);
  const summary = [...reasons, full ? 'Currently at capacity' : null].filter(Boolean).join('. ');

  return { score, full, factors, summary };
}

module.exports = { scoreMentor, slotsOverlap, WEIGHTS };

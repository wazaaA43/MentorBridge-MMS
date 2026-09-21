// Fills the database with realistic demo data that meets the brief's minimums:
// 10 mentors, 20 mentees, 8 expertise categories, 10 active matches, 15 booked sessions,
// 10 completed sessions, 10 session notes, 15 actions, 10 mentor + 10 mentee feedback records.
const bcrypt = require('bcryptjs');
const db = require('./db');
const { loadMentee, loadMentor, scoreMentor } = require('./services/matching');

const PASSWORD = 'Password123!';
const hash = bcrypt.hashSync(PASSWORD, 10);
const emailOf = (name) => name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/\s+/g, '.') + '@example.com';

const CATEGORIES = [
  'Business Strategy', 'Finance & Funding', 'Marketing & Sales', 'Leadership',
  'Technology & Digital', 'Operations & Supply Chain', 'Legal & Compliance', 'Career Development',
];

// name, title, organisation, sector, years, languages, modes, location, capacity, status, expertise
const MENTORS = [
  ['Thandi Mokoena', 'Senior Financial Manager', 'Nedbank', 'Finance', 15, 'English,isiZulu', 'online,in-person', 'Johannesburg', 2, 'active', ['Finance & Funding', 'Business Strategy']],
  ['Pieter van der Merwe', 'Supply Chain Director', 'Barloworld', 'Logistics', 20, 'English,Afrikaans', 'online,in-person', 'Pretoria', 3, 'active', ['Operations & Supply Chain', 'Business Strategy']],
  ['Naledi Sithole', 'Head of Marketing', 'Takealot', 'Retail', 12, 'English,Sesotho', 'online', 'Johannesburg', 4, 'active', ['Marketing & Sales', 'Career Development']],
  ['Sipho Dlamini', 'Engineering Manager', 'Discovery', 'Technology', 14, 'English,isiZulu', 'online,in-person', 'Pretoria', 3, 'active', ['Technology & Digital', 'Leadership']],
  ['Ayesha Patel', 'Corporate Lawyer', 'Bowmans', 'Legal', 11, 'English', 'online', 'Durban', 2, 'active', ['Legal & Compliance', 'Business Strategy']],
  ['Lerato Molefe', 'HR & Talent Executive', 'Sasol', 'Energy', 18, 'English,Setswana', 'online,in-person', 'Pretoria', 3, 'active', ['Leadership', 'Career Development']],
  ['Johan Botha', 'Founder & CFO', 'Cape Agri Group', 'Agriculture', 22, 'English,Afrikaans', 'in-person', 'Cape Town', 2, 'active', ['Finance & Funding', 'Operations & Supply Chain']],
  ['Zanele Khumalo', 'Digital Growth Lead', 'Yoco', 'Fintech', 9, 'English,isiZulu', 'online', 'Durban', 4, 'active', ['Marketing & Sales', 'Technology & Digital']],
  ['Michael Naidoo', 'Strategy Consultant', 'Deloitte', 'Consulting', 16, 'English', 'online,in-person', 'Johannesburg', 3, 'active', ['Business Strategy', 'Legal & Compliance']],
  ['Refilwe Nkosi', 'Careers Coach', 'Independent', 'Education', 10, 'English,Setswana,Sesotho', 'online', 'Pretoria', 3, 'paused', ['Career Development', 'Leadership']],
];

// name, programme, goal, needs, languages, mode, location
const MENTEES = [
  ['Kagiso Mahlangu', 'Entrepreneurship Accelerator', 'Launch a small catering business', ['Finance & Funding', 'Marketing & Sales'], 'English,Setswana', 'online', 'Pretoria'],
  ['Lindiwe Zulu', 'Entrepreneurship Accelerator', 'Register a company and understand tax', ['Legal & Compliance', 'Finance & Funding'], 'English,isiZulu', 'either', 'Johannesburg'],
  ['Ethan Jacobs', 'Graduate Development', 'Move into a supply chain role', ['Operations & Supply Chain', 'Career Development'], 'English,Afrikaans', 'in-person', 'Cape Town'],
  ['Palesa Radebe', 'Youth Leadership', 'Lead a community project', ['Leadership', 'Business Strategy'], 'English,Sesotho', 'online', 'Johannesburg'],
  ['Sanele Ndlovu', 'Graduate Development', 'Break into software development', ['Technology & Digital', 'Career Development'], 'English,isiZulu', 'online', 'Durban'],
  ['Amira Hassan', 'Entrepreneurship Accelerator', 'Grow an online clothing brand', ['Marketing & Sales', 'Technology & Digital'], 'English', 'online', 'Durban'],
  ['Thabo Sekgoma', 'Graduate Development', 'Prepare for a management track', ['Leadership', 'Career Development'], 'English,Setswana', 'either', 'Pretoria'],
  ['Megan Pillay', 'Entrepreneurship Accelerator', 'Secure a first round of funding', ['Finance & Funding', 'Business Strategy'], 'English', 'in-person', 'Johannesburg'],
  ['Bongani Cele', 'Youth Leadership', 'Build confidence leading teams', ['Leadership'], 'English,isiZulu', 'either', 'Durban'],
  ['Zodwa Mthembu', 'Entrepreneurship Accelerator', 'Improve logistics for a courier start-up', ['Operations & Supply Chain', 'Business Strategy'], 'English,isiZulu', 'online', 'Pretoria'],
  ['Ruan Steyn', 'Graduate Development', 'Explore legal-tech careers', ['Legal & Compliance', 'Technology & Digital'], 'English,Afrikaans', 'online', 'Cape Town'],
  ['Nomsa Buthelezi', 'Entrepreneurship Accelerator', 'Price products and manage cash flow', ['Finance & Funding', 'Operations & Supply Chain'], 'English,isiZulu', 'either', 'Johannesburg'],
  ['Tshepo Maseko', 'Youth Leadership', 'Public speaking and mentoring peers', ['Leadership', 'Career Development'], 'English,Setswana,Sesotho', 'either', 'Pretoria'],
  ['Fatima Moosa', 'Graduate Development', 'Land a first marketing role', ['Marketing & Sales', 'Career Development'], 'English', 'online', 'Durban'],
  ['Liam O\'Connor', 'Entrepreneurship Accelerator', 'Turn a side hustle into a company', ['Business Strategy', 'Finance & Funding'], 'English,Afrikaans', 'in-person', 'Cape Town'],
  ['Ayanda Ngcobo', 'Youth Leadership', 'Start a youth coding club', ['Technology & Digital', 'Leadership'], 'English,isiZulu', 'online', 'Durban'],
  ['Karabo Mokwena', 'Graduate Development', 'Plan a career pivot into consulting', ['Business Strategy', 'Career Development'], 'English,Setswana', 'either', 'Pretoria'],
  ['Chloe Adams', 'Entrepreneurship Accelerator', 'Meet compliance rules for a food business', ['Legal & Compliance', 'Operations & Supply Chain'], 'English', 'online', 'Johannesburg'],
  ['Sizwe Dube', 'Graduate Development', 'Improve interview and networking skills', ['Career Development', 'Marketing & Sales'], 'English,isiZulu', 'online', 'Johannesburg'],
  ['Precious Maluleke', 'Entrepreneurship Accelerator', 'Build a business plan', ['Business Strategy', 'Marketing & Sales'], 'English,Sesotho', 'either', 'Pretoria'],
];

// [mentorIndex, menteeIndex] -> 10 active matches. Mentor 0 (capacity 2) ends up FULL on purpose,
// so the capacity warning can be demonstrated live. Mentees 10-19 are unmatched for the matching demo.
const MATCHES = [[0, 0], [0, 1], [1, 2], [1, 9], [2, 4], [3, 5], [3, 3], [4, 7], [5, 6], [6, 8]];

const WINDOWS = [['09:00', '12:00'], ['13:00', '17:00'], ['17:00', '19:00']];
const mentorSlots = (i) => [0, 1, 2, 3].map((k) => ({ weekday: ((i + k) % 5) + 1, w: WINDOWS[(i + k) % 3] }));
const menteeSlots = (j) => [0, 1, 2].map((k) => ({ weekday: ((j + k * 2) % 5) + 1, w: WINDOWS[(j + k) % 3] }));

const at = (dayOffset, hour) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};
const iso = (d) => d.toISOString();
const plusHour = (d) => new Date(d.getTime() + 60 * 60 * 1000);
const dateOnly = (dayOffset) => at(dayOffset, 0).toISOString().slice(0, 10);

const NOTES = [
  ['Cash-flow basics and first budget', 'Break costs into fixed and variable; build a 3-month cash-flow sheet before approaching lenders.'],
  ['Understanding company registration and tax', 'Register with CIPC first, then SARS; keep personal and business accounts separate.'],
  ['Career map into supply chain', 'Target planner or buyer roles; get a short APICS/SAPICS course under your belt.'],
  ['Route planning and fleet costs', 'Track cost per delivery; consolidate routes before adding vehicles.'],
  ['Portfolio and first project', 'Ship one small project publicly; write a README that explains decisions, not just features.'],
  ['Brand positioning', 'Pick one customer segment and speak to them directly; drop the generic messaging.'],
  ['Leading a project team', 'Set roles and check-ins early; delegate outcomes rather than tasks.'],
  ['Investor-ready pitch', 'Lead with the problem and traction; keep the deck to 10 slides.'],
  ['Preparing for a management track', 'Ask for a stretch assignment and a sponsor; document your wins monthly.'],
  ['Team confidence and feedback', 'Practise giving specific, kind feedback; use a simple situation-behaviour-impact structure.'],
];
const ACTIONS = [
  'Build a 3-month cash-flow forecast', 'Open a separate business bank account', 'Draft CIPC registration documents', 'Book a SARS tax-registration appointment',
  'Complete a supply chain short course', 'Update CV with logistics experience', 'Map delivery routes and costs', 'Interview two other courier operators',
  'Publish a portfolio project on GitHub', 'Write the project README', 'Define one target customer segment', 'Redesign the landing page copy',
  'Draft a one-page project plan', 'Create a 10-slide investor deck', 'Ask manager for a stretch assignment',
];
const MENTOR_FEEDBACK = [
  'Mentee arrived prepared and followed up on the previous actions.', 'Good engagement; needs to break goals into smaller steps.',
  'Strong progress since last session.', 'Very motivated; we covered more than planned.', 'Slightly unprepared but open to guidance.',
  'Clear goals and thoughtful questions.', 'Excellent session, great discussion on next steps.', 'Making steady progress on actions.',
  'Confident and keen to apply the advice.', 'Strong reflection on the previous feedback.',
];
const MENTEE_FEEDBACK = [
  'My mentor gave me practical steps I can use straight away.', 'Really helpful, I feel much clearer on my plan.',
  'Great advice, would like a bit more time next session.', 'Very supportive and knowledgeable.', 'Useful session, the examples helped a lot.',
  'Learned a lot about how to position my business.', 'Slightly rushed, but the guidance was good.', 'Inspiring conversation and clear actions.',
  'Helped me see my next career step.', 'Excellent and encouraging feedback.',
];
const MENTOR_RATINGS = [5, 4, 4, 5, 3, 4, 5, 4, 4, 5];
const MENTEE_RATINGS = [5, 5, 4, 4, 4, 5, 3, 5, 4, 5];
const OUTCOMES = [
  [0, 'Completed first 3-month cash-flow forecast', 'Finance & Funding'],
  [1, 'Registered company with CIPC', 'Legal & Compliance'],
  [2, 'Enrolled in a supply chain short course', 'Career Development'],
  [4, 'Published first portfolio project on GitHub', 'Technology & Digital'],
  [5, 'Defined target customer segment and relaunched brand page', 'Marketing & Sales'],
  [7, 'Delivered a 10-slide investor pitch to a panel', 'Finance & Funding'],
];

const run = db.transaction(() => {
  for (const t of ['feedback', 'outcomes', 'actions', 'sessions', 'matches', 'availability_slots', 'mentee_needs', 'mentor_expertise', 'mentees', 'mentors', 'expertise_categories', 'users']) {
    db.exec(`DELETE FROM ${t}`);
  }
  db.exec("DELETE FROM sqlite_sequence");

  const addUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
  addUser.run('Programme Admin', 'admin@example.com', hash, 'admin');
  addUser.run('Programme Coach', 'coach@example.com', hash, 'coach');

  const catId = {};
  for (const c of CATEGORIES) catId[c] = db.prepare('INSERT INTO expertise_categories (name) VALUES (?)').run(c).lastInsertRowid;

  const addSlot = db.prepare('INSERT INTO availability_slots (owner_type, owner_id, weekday, start_time, end_time) VALUES (?,?,?,?,?)');
  const mentorIds = MENTORS.map((m, i) => {
    const uid = addUser.run(m[0], emailOf(m[0]), hash, 'mentor').lastInsertRowid;
    const id = db
      .prepare('INSERT INTO mentors (user_id, role_title, organisation, sector, years_experience, languages, modes, location, capacity, status) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(uid, m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9]).lastInsertRowid;
    m[10].forEach((c) => db.prepare('INSERT INTO mentor_expertise (mentor_id, category_id) VALUES (?,?)').run(id, catId[c]));
    mentorSlots(i).forEach((s) => addSlot.run('mentor', id, s.weekday, s.w[0], s.w[1]));
    return id;
  });
  const menteeIds = MENTEES.map((m, j) => {
    const uid = addUser.run(m[0], emailOf(m[0]), hash, 'mentee').lastInsertRowid;
    const id = db
      .prepare('INSERT INTO mentees (user_id, programme, interests, goals, languages, preferred_mode, location) VALUES (?,?,?,?,?,?,?)')
      .run(uid, m[1], m[3].join(', '), m[2], m[4], m[5], m[6]).lastInsertRowid;
    m[3].forEach((c) => db.prepare('INSERT INTO mentee_needs (mentee_id, category_id) VALUES (?,?)').run(id, catId[c]));
    menteeSlots(j).forEach((s) => addSlot.run('mentee', id, s.weekday, s.w[0], s.w[1]));
    return id;
  });

  // Active matches, scored by the same service the API uses (so explanations are real)
  const matchIds = MATCHES.map(([mi, ji]) => {
    const r = scoreMentor(loadMentee(menteeIds[ji]), loadMentor(mentorIds[mi]));
    return db
      .prepare('INSERT INTO matches (mentee_id, mentor_id, score, explanation, assigned_at) VALUES (?,?,?,?,?)')
      .run(menteeIds[ji], mentorIds[mi], r.score, JSON.stringify({ summary: r.summary, factors: r.factors }), iso(at(-40, 9))).lastInsertRowid;
  });

  const addSession = db.prepare(
    'INSERT INTO sessions (match_id, start_at, end_at, status, mode, attendance, duration_min, focus, guidance, follow_up_date) VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  const modeFor = (i) => (MENTORS[MATCHES[i][0]][6].includes('online') ? 'online' : 'in-person');

  // 10 completed sessions (with notes)
  const completedIds = MATCHES.map((_, i) => {
    const start = at(-(i + 3), 10);
    return addSession.run(matchIds[i], iso(start), iso(plusHour(start)), 'completed', modeFor(i), 'attended', 60 - (i % 3) * 5, NOTES[i][0], NOTES[i][1], dateOnly(-(i + 3) + 14)).lastInsertRowid;
  });

  // 15 booked (upcoming) sessions: 10 + 5, mix of confirmed / requested
  let n = 0;
  const upcoming = (i, day, hour) => {
    const start = at(day, hour);
    addSession.run(matchIds[i], iso(start), iso(plusHour(start)), n++ % 2 === 0 ? 'confirmed' : 'requested', modeFor(i), null, null, null, null, null);
  };
  MATCHES.forEach((_, i) => upcoming(i, i + 1, 14));
  for (let i = 0; i < 5; i++) upcoming(i, i + 12, 9);

  // A few past sessions that did not happen, so no-show / cancellation reporting has data
  [[2, -20, 'no_show', 'absent', 0], [5, -25, 'no_show', 'absent', 0], [7, -15, 'cancelled', null, null]].forEach(([i, d, st, att, dur]) => {
    const start = at(d, 11);
    addSession.run(matchIds[i], iso(start), iso(plusHour(start)), st, modeFor(i), att, dur, null, null, null);
  });

  // 15 actions across the completed sessions (mixed statuses, some past due => overdue)
  const addAction = db.prepare('INSERT INTO actions (session_id, description, owner_role, due_date, status, completed_at) VALUES (?,?,?,?,?,?)');
  const statuses = ['complete', 'in_progress', 'open'];
  ACTIONS.forEach((desc, a) => {
    const session = a < 10 ? completedIds[Math.floor(a / 2)] : completedIds[a - 5];
    const due = dateOnly((a % 5 - 2) * 4);
    const st = statuses[a % 3];
    addAction.run(session, desc, a % 2 === 0 ? 'mentee' : 'mentor', due, st, st === 'complete' ? iso(at(-1, 12)) : null);
  });

  // 10 mentor + 10 mentee feedback records, one of each per completed session
  const addFeedback = db.prepare('INSERT INTO feedback (session_id, from_role, rating, ratings_json, comments) VALUES (?,?,?,?,?)');
  completedIds.forEach((sid, i) => {
    addFeedback.run(sid, 'mentor', MENTOR_RATINGS[i], JSON.stringify({ preparedness: MENTOR_RATINGS[i], engagement: Math.min(5, MENTOR_RATINGS[i] + (i % 2)), progress: MENTOR_RATINGS[i] }), MENTOR_FEEDBACK[i]);
    addFeedback.run(sid, 'mentee', MENTEE_RATINGS[i], JSON.stringify({ usefulness: MENTEE_RATINGS[i], clarity: MENTEE_RATINGS[i], support: Math.min(5, MENTEE_RATINGS[i] + (i % 2)) }), MENTEE_FEEDBACK[i]);
  });

  // Development outcomes linked to matches
  OUTCOMES.forEach(([i, desc, cat], k) =>
    db.prepare('INSERT INTO outcomes (match_id, description, category, achieved_on) VALUES (?,?,?,?)').run(matchIds[i], desc, cat, dateOnly(-k * 3 - 1))
  );
});

run();

const count = (t, where = '') => db.prepare(`SELECT COUNT(*) AS c FROM ${t} ${where}`).get().c;
console.log('Seed complete:');
console.log(`  mentors ${count('mentors')} | mentees ${count('mentees')} | categories ${count('expertise_categories')}`);
console.log(`  active matches ${count('matches', "WHERE status='active'")} | booked sessions ${count('sessions', "WHERE status IN ('requested','confirmed')")} | completed ${count('sessions', "WHERE status='completed'")}`);
console.log(`  session notes ${count('sessions', 'WHERE focus IS NOT NULL')} | actions ${count('actions')} | mentor feedback ${count('feedback', "WHERE from_role='mentor'")} | mentee feedback ${count('feedback', "WHERE from_role='mentee'")}`);
console.log(`\nLogins (all passwords: ${PASSWORD})`);
console.log('  admin@example.com | coach@example.com | thandi.mokoena@example.com (mentor, at capacity) | kagiso.mahlangu@example.com (mentee)');

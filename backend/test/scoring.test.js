const test = require('node:test');
const assert = require('node:assert');
const { scoreMentor, slotsOverlap } = require('../src/services/scoring');

const mentee = {
  needs: ['Finance & Funding', 'Marketing & Sales'],
  languages: ['English', 'isiZulu'],
  preferred_mode: 'online',
  location: 'Pretoria',
  slots: [{ weekday: 1, start_time: '09:00', end_time: '12:00' }],
};
const mentor = {
  expertise: ['Finance & Funding', 'Business Strategy'],
  languages: ['English'],
  modes: ['online'],
  location: 'Johannesburg',
  capacity: 4,
  activeCount: 1,
  slots: [{ weekday: 1, start_time: '10:00', end_time: '13:00' }],
};

test('slotsOverlap detects overlapping and non-overlapping windows', () => {
  assert.ok(slotsOverlap(mentee.slots[0], mentor.slots[0]));
  assert.ok(!slotsOverlap(mentee.slots[0], { weekday: 1, start_time: '12:00', end_time: '14:00' }));
  assert.ok(!slotsOverlap(mentee.slots[0], { weekday: 2, start_time: '09:00', end_time: '12:00' }));
});

test('scoreMentor returns an explainable, correctly weighted result', () => {
  const r = scoreMentor(mentee, mentor);
  const pts = Object.fromEntries(r.factors.map((f) => [f.factor, f.points]));
  assert.deepStrictEqual(pts, { expertise: 20, availability: 20, language: 15, mode: 10, capacity: 11 });
  assert.strictEqual(r.score, 76);
  assert.strictEqual(r.full, false);
  assert.ok(r.factors.every((f) => typeof f.detail === 'string' && f.detail.length > 0));
});

test('mentor at capacity is flagged and gets no capacity points', () => {
  const r = scoreMentor(mentee, { ...mentor, capacity: 2, activeCount: 2 });
  assert.strictEqual(r.full, true);
  assert.strictEqual(r.factors.find((f) => f.factor === 'capacity').points, 0);
  assert.match(r.summary, /at capacity/i);
});

test('in-person preference rewards same city', () => {
  const inPerson = { ...mentee, preferred_mode: 'in-person' };
  const sameCity = scoreMentor(inPerson, { ...mentor, modes: ['in-person'], location: 'Pretoria' });
  const otherCity = scoreMentor(inPerson, { ...mentor, modes: ['in-person'], location: 'Durban' });
  assert.strictEqual(sameCity.factors.find((f) => f.factor === 'mode').points, 10);
  assert.strictEqual(otherCity.factors.find((f) => f.factor === 'mode').points, 4);
});

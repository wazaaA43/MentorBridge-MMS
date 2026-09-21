const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, requireAuth } = require('../middleware/auth');
const { profileFor } = require('../services/access');

function publicUser(u) {
  const p = profileFor(u);
  return { id: u.id, name: u.name, email: u.email, role: u.role, profile_id: p ? p.id : null };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(u), user: publicUser(u) });
});

// Self-registration is limited to mentor / mentee. Admin and coach accounts are created by seeding.
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (!['mentor', 'mentee'].includes(role)) return res.status(400).json({ error: 'role must be mentor or mentee' });
  if (String(password).length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(String(email).toLowerCase()))
    return res.status(409).json({ error: 'email already registered' });
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
    .run(name, String(email).toLowerCase(), bcrypt.hashSync(password, 10), role);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: sign(u), user: publicUser(u) });
});

router.get('/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(401).json({ error: 'User no longer exists' });
  res.json(publicUser(u));
});

module.exports = router;

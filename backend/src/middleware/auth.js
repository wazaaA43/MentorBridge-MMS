const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '8h' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: `Not allowed for role "${req.user.role}"` });
}

module.exports = { sign, requireAuth, requireRole };

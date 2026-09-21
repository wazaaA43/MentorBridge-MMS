const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/people'));
app.use('/', require('./routes/matches'));
app.use('/', require('./routes/sessions'));
app.use('/', require('./routes/dashboard'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code && String(err.code).startsWith('SQLITE_CONSTRAINT')) return res.status(400).json({ error: 'Invalid data', detail: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

module.exports = app;

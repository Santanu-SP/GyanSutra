require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const chaptersRouter = require('./routes/chapters');
const versesRouter = require('./routes/verses');
const searchRouter = require('./routes/search');
const askRouter = require('./routes/ask');
const recommendationsRouter = require('./routes/recommendations');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & Logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter for /ask (embedding + generation calls are expensive)
const askLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.ASK_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many questions — please wait a moment before asking again.' },
});

app.use('/api', generalLimiter);
app.use('/api/ask', askLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/chapters', chaptersRouter);
app.use('/api/verses', versesRouter);
app.use('/api/search', searchRouter);
app.use('/api/ask', askRouter);
app.use('/api/recommendations', recommendationsRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }
  res.status(status).json({ error: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Gyan Sutra API] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;

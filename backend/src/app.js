require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const chaptersRouter = require('./routes/chapters');
const sourcesRouter = require('./routes/sources');
const versesRouter = require('./routes/verses');
const searchRouter = require('./routes/search');
const askRouter = require('./routes/ask');
const recommendationsRouter = require('./routes/recommendations');
const sitemapRoute = require('./routes/sitemap');
const robotsRoute = require('./routes/robots');

const app = express();

function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

const trustProxyHops = parsePositiveInteger(
  process.env.TRUST_PROXY_HOPS,
  process.env.NODE_ENV === 'production' ? 1 : 0,
  10,
);
if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

// ── Security & Logging ────────────────────────────────────────────────────────
app.use(helmet());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const defaultOrigins = [
  'https://gyansutraapp.pages.dev',
  'https://santanu-sp.github.io',
  'https://localhost', // Capacitor Android's bundled web origin
  'http://localhost:5173',
  'http://localhost:3001',
];

const envOriginsStr = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN;
const configuredOrigins = envOriginsStr
  ? envOriginsStr.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    const error = new Error('Origin is not allowed by CORS.');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
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
  max: parsePositiveInteger(process.env.ASK_RATE_LIMIT_MAX, 20, 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many questions - please wait a moment before asking again.' },
});

app.use('/api', generalLimiter);
app.use('/api/ask', askLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/chapters', chaptersRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/verses', versesRouter);
app.use('/api/search', searchRouter);
app.use('/api/ask', askRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/narration', require('./routes/narration'));

app.use(sitemapRoute);
app.use(robotsRoute);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);

  const rawStatus = Number(err.status || err.statusCode);
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  const isInvalidJson = err.type === 'entity.parse.failed';
  const responseStatus = isInvalidJson ? 400 : status;

  if (responseStatus >= 500) {
    console.error('[ERROR]', err);
  }

  const message = isInvalidJson
    ? 'Request body contains invalid JSON.'
    : responseStatus >= 500 && !err.expose
      ? 'Internal server error.'
      : (err.message || 'Request failed.');

  return res.status(responseStatus).json({ error: message });
});

module.exports = app;

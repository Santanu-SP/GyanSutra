const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const locales = new Set(['sa-IN', 'en-IN', 'hi-IN', 'bn-IN', 'mr-IN', 'te-IN', 'ta-IN']);
const cache = new Map();
let cacheBytes = 0;
let inFlight = 0;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

router.use(rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

router.post('/', async (req, res) => {
  const { text, locale, style } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 360
    || !locales.has(locale) || !['recitation', 'meaning'].includes(style)) {
    return res.status(400).json({ error: 'Provide up to 360 characters, a supported locale, and a narration style.' });
  }
  const serviceURL = process.env.NARRATION_SERVICE_URL;
  if (!serviceURL) return res.status(503).json({ error: 'Natural narration is not configured.' });
  const key = JSON.stringify([serviceURL, text, locale, style]);
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return res.type('audio/wav').set('Cache-Control', 'private, max-age=86400').send(cached);
  }
  if (inFlight >= 2) return res.status(503).json({ error: 'Narrator is busy. Please try again.' });
  inFlight += 1;
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 85_000);
  res.on('close', abort);
  try {
    const response = await fetch(`${serviceURL.replace(/\/$/, '')}/synthesize`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(process.env.NARRATION_SERVICE_TOKEN
        ? { Authorization: `Bearer ${process.env.NARRATION_SERVICE_TOKEN}` } : {}) },
      body: JSON.stringify({ text: text.trim(), locale, style }),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('audio/wav')) {
      throw new Error('Narration service unavailable');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_AUDIO_BYTES) { controller.abort(); throw new Error('Audio too large'); }
      chunks.push(chunk);
    }
    const audio = Buffer.concat(chunks);
    if (audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF'
      || audio.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Invalid audio');
    // Account for simultaneous identical requests without inflating the cache size.
    cacheBytes -= cache.get(key)?.length || 0;
    cache.set(key, audio);
    cacheBytes += audio.length;
    while (cacheBytes > MAX_CACHE_BYTES) {
      const oldest = cache.keys().next().value;
      cacheBytes -= cache.get(oldest).length;
      cache.delete(oldest);
    }
    if (!res.destroyed) res.type('audio/wav').set('Cache-Control', 'private, max-age=86400').send(audio);
  } catch {
    if (!res.destroyed) res.status(503).json({ error: 'Natural narration is temporarily unavailable.' });
  } finally {
    clearTimeout(timeout);
    res.off('close', abort);
    inFlight -= 1;
  }
});

module.exports = router;

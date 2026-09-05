const express = require('express');
const request = require('supertest');
const router = require('../routes/narration');

const app = express();
app.use(express.json());
app.use('/api/narration', router);
const payload = { text: 'कर्मण्येवाधिकारस्ते', locale: 'sa-IN', style: 'recitation' };
const originalFetch = global.fetch;
const originalURL = process.env.NARRATION_SERVICE_URL;
const wav = Buffer.alloc(46);
wav.write('RIFF', 0);
wav.write('WAVE', 8);

afterEach(() => {
  global.fetch = originalFetch;
  if (originalURL === undefined) delete process.env.NARRATION_SERVICE_URL;
  else process.env.NARRATION_SERVICE_URL = originalURL;
});

test('unconfigured worker returns a quick, explicit fallback response', async () => {
  delete process.env.NARRATION_SERVICE_URL;
  const result = await request(app).post('/api/narration').send(payload);
  expect(result.status).toBe(503);
});

test.each([
  { ...payload, text: '' }, { ...payload, text: 'a'.repeat(361) },
  { ...payload, locale: 'invalid' }, { ...payload, style: 'arbitrary prompt' },
])('rejects invalid synthesis input before contacting the worker', async (body) => {
  global.fetch = jest.fn();
  expect((await request(app).post('/api/narration').send(body)).status).toBe(400);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('proxies WAV and caches identical text, locale and delivery', async () => {
  process.env.NARRATION_SERVICE_URL = 'http://narrator.test/cache';
  global.fetch = jest.fn(async () => new Response(wav, { headers: { 'Content-Type': 'audio/wav' } }));
  const first = await request(app).post('/api/narration').send(payload);
  const second = await request(app).post('/api/narration').send(payload);
  expect(first.status).toBe(200);
  expect(second.headers['content-type']).toContain('audio/wav');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual(payload);
  await request(app).post('/api/narration').send({ ...payload, style: 'meaning' });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('does not return malformed worker output as playable audio', async () => {
  process.env.NARRATION_SERVICE_URL = 'http://narrator.test/invalid';
  global.fetch = jest.fn(async () => new Response('not a wav', { headers: { 'Content-Type': 'audio/wav' } }));
  expect((await request(app).post('/api/narration').send(payload)).status).toBe(503);
});

test('worker failure is recoverable by device narration', async () => {
  process.env.NARRATION_SERVICE_URL = 'http://narrator.test/down';
  global.fetch = jest.fn(async () => { throw new Error('Connection refused'); });
  expect((await request(app).post('/api/narration').send(payload)).status).toBe(503);
});

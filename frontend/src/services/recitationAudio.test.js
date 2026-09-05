import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecitationFetcher } from './recitationAudio.js';

const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 77, 52, 65, 32]);
const recording = { url: 'https://example.org/2.47.m4a' };
const signal = () => new AbortController().signal;

function cacheStorage() {
  const entries = new Map();
  const cache = {
    match: async (key) => entries.get(key)?.clone(),
    put: async (key, value) => { entries.set(key, value); },
    keys: async () => [...entries.keys()],
    delete: async (key) => entries.delete(key),
  };
  return { entries, open: async () => cache };
}

test('reuses a recording offline without any further network request', async () => {
  const caches = cacheStorage();
  let online = true;
  let requests = 0;
  const fetchAudio = createRecitationFetcher({
    caches, online: () => online,
    fetch: async () => { requests++; return new Response(bytes); },
  });
  assert.equal((await fetchAudio(recording, signal())).type, 'audio/mp4');
  online = false;
  assert.equal((await fetchAudio(recording, signal())).size, bytes.length);
  assert.equal(requests, 1);
});

test('storage failure does not prevent online playback', async () => {
  const fetchAudio = createRecitationFetcher({
    caches: { open: async () => { throw new Error('storage blocked'); } },
    online: () => true, fetch: async () => new Response(bytes),
  });
  assert.equal((await fetchAudio(recording, signal())).size, bytes.length);
});

test('rejects missing, invalid, or oversized recordings rather than caching them', async () => {
  for (const response of [new Response('', { status: 404 }), new Response('<html>error</html>'),
    new Response(bytes, { headers: { 'Content-Length': '5000000' } })]) {
    const caches = cacheStorage();
    const fetchAudio = createRecitationFetcher({ caches, online: () => true, fetch: async () => response });
    await assert.rejects(fetchAudio(recording, signal()));
    assert.equal(caches.entries.size, 0);
  }
});

test('caps stored recordings and evicts the oldest download', async () => {
  const caches = cacheStorage();
  const fetchAudio = createRecitationFetcher({ caches, online: () => true, fetch: async () => new Response(bytes) });
  for (let i = 0; i < 33; i++) await fetchAudio({ url: `https://example.org/${i}.m4a` }, signal());
  assert.equal(caches.entries.size, 32);
  assert.equal(caches.entries.has('https://example.org/0.m4a'), false);
});

test('an already stopped session does not read cache or start a network request', async () => {
  const controller = new AbortController();
  controller.abort();
  let requested = false;
  const fetchAudio = createRecitationFetcher({ online: () => true, fetch: async () => { requested = true; } });
  await assert.rejects(fetchAudio(recording, controller.signal), { name: 'AbortError' });
  assert.equal(requested, false);
});

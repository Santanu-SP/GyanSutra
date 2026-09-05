import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNarrationPlayer } from './narrationPlayer.js';

const segment = { text: 'कर्मण्येवाधिकारस्ते', kind: 'verse', locale: 'sa-IN', pause: 0 };
const voices = [{ lang: 'hi-IN', name: 'Hindi', voiceURI: 'hi', localService: true }];
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup(fetchAudio = async () => { throw new Error('unavailable'); }, speak = async () => {}) {
  const spoken = [];
  const played = [];
  let stops = 0;
  class Audio {
    play() { if (this.src.startsWith('blob:')) { played.push(this.src); queueMicrotask(() => this.onended?.()); } return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  const start = createNarrationPlayer({
    Audio, online: () => true, fetchNarrationAudio: fetchAudio,
    TextToSpeech: { stop: async () => { stops++; }, speak: async (options) => { spoken.push(options); await speak(options); }, getSupportedVoices: async () => ({ voices }) },
  });
  return { start, spoken, played, stops: () => stops };
}
const options = { voices, rate: 0.95, onSegment() {}, onFallback() {} };

test('unavailable neural service reads every segment in order with slower Sanskrit', async () => {
  const { start, spoken } = setup();
  let fallback = false;
  const session = start(() => {});
  await session.play([segment, { ...segment, text: 'अर्थ', kind: 'translation', locale: 'hi-IN' }], {
    ...options, onFallback() { fallback = true; },
  });
  assert.equal(fallback, true);
  assert.deepEqual(spoken.map((s) => s.text), [segment.text, 'अर्थ']);
  assert.ok(spoken[0].rate < spoken[1].rate);
  session.stop();
});

test('stop during preparation prevents delayed audio and device speech', async () => {
  const pending = deferred();
  const { start, spoken, played } = setup(() => pending.promise);
  const session = start(() => {});
  const playing = session.play([segment], options);
  const rejected = assert.rejects(playing, { name: 'AbortError' });
  await tick();
  session.stop();
  pending.resolve(new Blob(['audio']));
  await rejected;
  assert.equal(spoken.length + played.length, 0);
});

test('a new reader owns playback; stale cleanup cannot stop it', () => {
  const { start, stops } = setup();
  let interrupted = 0;
  const first = start(() => { interrupted++; });
  const second = start(() => {});
  assert.equal(interrupted, 1);
  const before = stops();
  first.stop();
  assert.equal(stops(), before);
  assert.equal(second.signal.aborted, false);
  second.stop();
});

test('neural playback keeps order and does not invoke device synthesis', async () => {
  const requested = [];
  const { start, spoken, played } = setup(async (s) => { requested.push(s.text); return new Blob(['audio']); });
  const session = start(() => {});
  await session.play([segment, { ...segment, text: 'Next' }], options);
  assert.deepEqual(requested, [segment.text, 'Next']);
  assert.equal(played.length, 2);
  assert.equal(spoken.length, 0);
  session.stop();
});

test('a missing Sanskrit and Hindi voice fails instead of skipping the verse', async () => {
  const { start } = setup();
  const session = start(() => {});
  await assert.rejects(session.play([segment], { ...options, voices: [{ lang: 'en-IN' }] }), /MISSING_VOICE/);
  session.stop();
});

test('stop during device speech settles the session and prevents the next section', async () => {
  const pending = deferred();
  const { start, spoken } = setup(undefined, () => pending.promise);
  const session = start(() => {});
  const playing = session.play([segment, { ...segment, text: 'Next' }], options);
  const rejected = assert.rejects(playing, { name: 'AbortError' });
  await tick();
  session.stop();
  await rejected;
  pending.resolve();
  await tick();
  assert.equal(spoken.length, 1);
});

test('a later service failure falls back at that segment without repeating the verse', async () => {
  let requests = 0;
  const { start, spoken, played } = setup(async () => {
    if (requests++) throw new Error('unavailable');
    return new Blob(['audio']);
  });
  const session = start(() => {});
  await session.play([segment, { ...segment, text: 'अर्थ', kind: 'translation', locale: 'hi-IN' }], options);
  assert.equal(played.length, 1);
  assert.deepEqual(spoken.map((s) => s.text), ['अर्थ']);
  session.stop();
});

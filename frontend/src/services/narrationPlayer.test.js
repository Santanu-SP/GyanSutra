import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNarrationPlayer } from './narrationPlayer.js';

const segment = { text: 'कर्मण्येवाधिकारस्ते', kind: 'verse', locale: 'sa-IN', pause: 0 };
const voices = [{ lang: 'hi-IN', name: 'Hindi', voiceURI: 'hi', localService: true }];
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup(fetchAudio = async () => { throw new Error('unavailable'); }, speak = async () => {},
  fetchRecitationAudio = async () => new Blob(['recording']), finishAudio = true) {
  const spoken = [];
  const played = [];
  let stops = 0;
  class Audio {
    play() {
      if (this.src.startsWith('blob:')) {
        played.push(this.src);
        queueMicrotask(() => { this.onplaying?.(); if (finishAudio) this.onended?.(); });
      }
      return Promise.resolve();
    }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  const start = createNarrationPlayer({
    Audio, online: () => true, fetchNarrationAudio: fetchAudio,
    fetchRecitationAudio,
    TextToSpeech: { stop: async () => { stops++; }, speak: async (options) => { spoken.push(options); await speak(options); }, getSupportedVoices: async () => ({ voices }) },
  });
  return { start, spoken, played, stops: () => stops };
}
const options = { voices, rate: 0.95, mode: 'neural', onSegment() {}, onFallback() {} };

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

const recording = { url: 'https://example.org/2.47.m4a' };
const meaning = { ...segment, text: 'अर्थ', kind: 'translation', locale: 'hi-IN' };

test('human recording replaces all Sanskrit chunks, then device reads meaning in order', async () => {
  let neuralRequests = 0;
  let recordingRequests = 0;
  const { start, spoken, played } = setup(async () => { neuralRequests++; }, undefined,
    async () => { recordingRequests++; return new Blob(['recording']); });
  const sources = [];
  const session = start(() => {});
  await session.play([segment, { ...segment, text: 'Second half' }, meaning], {
    ...options, mode: 'recorded', recording, selectedVoice: 'hi', onSource: (source) => sources.push(source),
  });
  assert.equal(recordingRequests, 1);
  assert.equal(neuralRequests, 0);
  assert.equal(played.length, 1);
  assert.deepEqual(spoken.map((s) => s.text), ['अर्थ']);
  assert.deepEqual(sources, ['recording', 'device']);
  session.stop();
});

test('unavailable recording falls back to the whole verse before the meaning', async () => {
  const { start, spoken } = setup(undefined, undefined, async () => { throw new Error('404'); });
  const session = start(() => {});
  const reasons = [];
  await session.play([segment, meaning], { ...options, mode: 'recorded', recording, onFallback: (reason) => reasons.push(reason) });
  assert.deepEqual(reasons, ['recording']);
  assert.deepEqual(spoken.map((s) => s.text), [segment.text, 'अर्थ']);
  session.stop();
});

test('default mode never contacts the unconfigured neural worker', async () => {
  let requested = false;
  const { start, spoken } = setup(async () => { requested = true; });
  const session = start(() => {});
  await session.play([segment], { ...options, mode: undefined });
  assert.equal(requested, false);
  assert.equal(spoken.length, 1);
  session.stop();
});

test('stop during recording download settles immediately and never starts late audio', async () => {
  const pending = deferred();
  const { start, played, spoken } = setup(undefined, undefined, () => pending.promise);
  const session = start(() => {});
  const playing = session.play([segment, meaning], { ...options, mode: 'recorded', recording });
  const rejected = assert.rejects(playing, { name: 'AbortError' });
  await tick();
  session.stop();
  await rejected;
  pending.resolve(new Blob(['recording']));
  await tick();
  assert.equal(played.length + spoken.length, 0);
});

test('stop mid-recording prevents the meaning from starting', async () => {
  const { start, played, spoken } = setup(undefined, undefined, undefined, false);
  const session = start(() => {});
  const playing = session.play([segment, meaning], { ...options, mode: 'recorded', recording });
  const rejected = assert.rejects(playing, { name: 'AbortError' });
  await tick();
  assert.equal(played.length, 1);
  session.stop();
  await rejected;
  assert.equal(spoken.length, 0);
});

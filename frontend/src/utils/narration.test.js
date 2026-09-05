import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNarration, speechChunks, cleanSpeechText, rankedVoices, deviceVoice } from './narration.js';

const labels = { translation: 'Meaning', explanation: 'Explanation', context: 'Context' };
test('recites lines before meaning and optional sections, without verse numbers or markdown', () => {
  const script = buildNarration({
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥२.४७॥',
    translation: '**Act** without attachment.', explanation: 'Do your duty.', context: 'Krishna speaks.',
    contentLanguage: 'english', full: true, labels,
  });
  assert.deepEqual(script.map((s) => s.kind), ['verse', 'verse', 'translation', 'translation', 'explanation', 'explanation', 'context', 'context']);
  assert.ok(script.slice(0, 2).every((s) => s.locale === 'sa-IN'));
  assert.ok(script.slice(2).every((s) => s.locale === 'en-IN'));
  assert.ok(!script.some((s) => /[२४७*॥]/u.test(s.text)));
  assert.ok(script[1].pause > script[0].pause);
});

test('does not repeat identical meanings or read excluded sections', () => {
  const props = { translation: 'Meaning.', explanation: 'Meaning.', context: 'Context.', contentLanguage: 'hindi', labels };
  const full = buildNarration({ ...props, full: true });
  assert.ok(!full.some((s) => s.kind === 'explanation'));
  assert.deepEqual(buildNarration(props).map((s) => s.kind), ['translation', 'translation']);
  assert.ok(full.every((s) => s.locale === 'hi-IN'));
  assert.deepEqual(buildNarration({ labels }), []);
});

test('chunks bounded text without losing words or reading link syntax', () => {
  const source = `${'A long phrase, '.repeat(100)}End.`;
  const chunks = speechChunks(source);
  assert.ok(chunks.every((s) => s.length <= 360));
  assert.equal(chunks.join(' '), source.trim());
  assert.equal(cleanSpeechText('## **Meaning**\n[wisdom](https://example.org)'), 'Meaning\nwisdom');
});

test('voice selection preserves native prototype properties and source indices', () => {
  const native = Object.create({ name: 'Natural voice', lang: 'en-IN', voiceURI: 'natural', localService: false });
  const voices = [{ name: 'Default', lang: 'en-IN', voiceURI: 'default', localService: true }, native,
    { name: 'Hindi', lang: 'hi-IN', voiceURI: 'hindi', localService: true }];
  assert.equal(rankedVoices(voices, 'en-IN')[0].index, 1);
  assert.equal(deviceVoice(voices, 'en-IN', 'default').index, 0);
  assert.equal(deviceVoice(voices, 'en-IN', '', false).index, 0);
  assert.equal(deviceVoice(voices, 'sa-IN').lang, 'hi-IN');
  assert.equal(deviceVoice(voices, 'ta-IN'), undefined);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVerseRecording, GITA_VERSE_COUNTS } from './recitations.js';

test('maps all 701 Gita verse references to pinned, attributed recordings', () => {
  let count = 0;
  const urls = new Set();
  GITA_VERSE_COUNTS.forEach((total, index) => {
    for (let verse = 1; verse <= total; verse++) {
      const recording = getVerseRecording({ book: 'bhagavad-gita', chapterNumber: index + 1, verseNumber: verse });
      assert.match(recording.url, /\/1c5a5105c2e52438fa3c4dfe8727c5abf53233f4\/audio\/.*\.m4a$/);
      assert.equal(recording.artist, 'Rohan');
      assert.equal(recording.license, 'CC BY-NC-ND 4.0');
      urls.add(recording.url);
      count++;
    }
  });
  assert.equal(count, 701);
  assert.equal(urls.size, count);
});

test('handles source filename spaces without changing verse numbering', () => {
  const url = (chapterNumber, verseNumber) => getVerseRecording({ book: 'bhagavad-gita', chapterNumber, verseNumber }).url;
  assert.ok(url(13, 14).endsWith('/13%20.14.m4a'));
  assert.ok(url(13, 26).endsWith('/13.%2026.m4a'));
  assert.ok(url(17, 2).endsWith('/17.2.m4a'));
  assert.ok(url(18, 59).endsWith('/18%20.59.m4a'));
});

test('never substitutes a Gita verse for another book or invalid reference', () => {
  for (const book of ['ramayana', 'upanishads', undefined]) {
    assert.equal(getVerseRecording({ book, chapterNumber: 2, verseNumber: 47 }), null);
  }
  for (const [chapterNumber, verseNumber] of [[0, 1], [19, 1], [1, 48], [1, 0], [1, 1.5], [1, '1-2']]) {
    assert.equal(getVerseRecording({ book: 'bhagavad-gita', chapterNumber, verseNumber }), null);
  }
});

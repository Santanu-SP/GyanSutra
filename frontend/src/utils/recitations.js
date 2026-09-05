// Recording inventory checked against the pinned source tree. Audio is used
// unchanged under CC BY-NC-ND 4.0; see backend/narration/README.md.
export const GITA_RECORDING_SOURCE = {
  artist: 'Rohan',
  sourceURL: 'https://github.com/bhagavdgita/bhagavdgita.github.io/tree/1c5a5105c2e52438fa3c4dfe8727c5abf53233f4/audio',
  license: 'CC BY-NC-ND 4.0',
  licenseURL: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
};
const BASE = 'https://raw.githubusercontent.com/bhagavdgita/bhagavdgita.github.io/1c5a5105c2e52438fa3c4dfe8727c5abf53233f4/audio/';
export const GITA_VERSE_COUNTS = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
const FILE_OVERRIDES = {
  '13.14': '13 .14', '13.15': '13 .15', '13.26': '13. 26',
  '16.18': '16 .18', '16.19': '16 .19', '16.22': '16 .22',
  '17.3': '17. 3', '18.14': '18 .14', '18.59': '18 .59',
};

export function getVerseRecording({ book, chapterNumber, verseNumber }) {
  // Never infer the book from a chapter number; Ramayana has overlapping IDs.
  if (book !== 'bhagavad-gita') return null;
  const chapter = Number(chapterNumber);
  const verse = Number(verseNumber);
  if (!Number.isInteger(chapter) || !Number.isInteger(verse)
    || chapter < 1 || chapter > 18 || verse < 1 || verse > GITA_VERSE_COUNTS[chapter - 1]) return null;
  const key = `${chapter}.${verse}`;
  return { ...GITA_RECORDING_SOURCE, url: `${BASE}${encodeURIComponent(FILE_OVERRIDES[key] || key)}.m4a` };
}

export const RAMAYANA_COLLECTION = {
  sourceURL: 'https://archive.org/details/Ramayana-recitation-Sriram-harisItArAmamUrti-Ghanapaati-v2',
  artist: 'V. Sriram & Harisitaramamurti',
};

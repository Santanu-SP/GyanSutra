const express = require('express');
const { collections } = require('../services/firestore');
const gitaData = require('../../data/gita.json');

const router = express.Router();

/**
 * GET /api/verses/daily
 * Intelligently returns a "Daily Darshan" verse that changes every day,
 * using zero AI credits and zero database reads.
 */
router.get('/daily', (req, res) => {
  // Deterministic daily index based on days since epoch
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  const verseIndex = daysSinceEpoch % gitaData.length;
  
  const v = gitaData[verseIndex];
  
  // Format to match the expected verse schema on the frontend
  const formattedVerse = {
    id: `bhagavad-gita_${v.chapter_number}_${v.verse_number}`,
    chapterNumber: v.chapter_number,
    verseNumber: v.verse_number,
    sanskrit: v.sanskrit,
    transliteration: v.transliteration,
    translationEnglish: v.english,
    translationHindi: v.hindi,
    wordMeanings: v.word_meanings ? v.word_meanings.split('?').map(item => {
      const parts = item.split(' ');
      return { word: parts[0]?.trim() || '', meaning: parts.slice(1).join(' ')?.trim() || '' };
    }).filter(item => item.word && !item.word.includes('Commentary')) : [],
    detailedExplanations: v.detailed_explanations || [],
  };

  res.json({ verse: formattedVerse });
});

/**
 * GET /api/verses/ramayana/:kandaNumber/:sarga
 * Returns all verses for a given Kanda and Sarga in the Ramayana.
 */
router.get('/ramayana/:kandaNumber/:sarga', async (req, res, next) => {
  try {
    const kandaNum = parseInt(req.params.kandaNumber, 10);
    const sarga = parseInt(req.params.sarga, 10);

    const snap = await collections.verses()
      .where('book', '==', 'ramayana')
      .where('kandaNumber', '==', kandaNum)
      .where('sarga', '==', sarga)
      .get();

    const verses = snap.docs
      .map((doc) => {
        const data = doc.data();
        delete data.embedding;
        return { id: doc.id, ...data };
      })
      .sort((a, b) => a.shlokaNumber - b.shlokaNumber);

    res.json({ verses });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/verses/:source_id
 * Returns all verses for a given source_id (e.g. bhagavad-gita).
 */
router.get('/:source_id', async (req, res, next) => {
  try {
    const snap = await collections.verses()
      .where('source_id', '==', req.params.source_id)
      .get();

    const verses = snap.docs
      .map((doc) => {
        const data = doc.data();
        delete data.embedding;
        return { id: doc.id, ...data };
      })
      .sort((a, b) => {
        if (a.chapterNumber !== b.chapterNumber) {
          return a.chapterNumber - b.chapterNumber;
        }
        return a.verseNumber - b.verseNumber;
      });

    res.json({ verses });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

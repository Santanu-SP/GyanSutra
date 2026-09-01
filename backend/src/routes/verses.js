const express = require('express');
const { collections, getDoc } = require('../services/firestore');
const { SOURCES } = require('../data/sources');

const router = express.Router();
const SOURCE_IDS = new Set(SOURCES.map((source) => source.id));
const GITA_VERSE_COUNTS = [47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78];
const GITA_VERSE_TOTAL = GITA_VERSE_COUNTS.reduce((sum, count) => sum + count, 0);

let dailyCache = null;

function withoutEmbedding(data) {
  const { embedding: _embedding, ...safeData } = data;
  return safeData;
}

function toVerseSummary(verse) {
  return {
    id: verse.id,
    chapterNumber: verse.chapterNumber,
    verseNumber: verse.verseNumber,
    book: verse.book,
    kanda: verse.kanda,
    kandaNumber: verse.kandaNumber,
    sarga: verse.sarga,
    shlokaNumber: verse.shlokaNumber,
    sanskrit: verse.sanskrit || '',
    transliteration: verse.transliteration || '',
    translationEnglish: verse.translationEnglish || '',
    translationHindi: verse.translationHindi || '',
    explanationEnglish: verse.explanationEnglish || '',
    tags: verse.tags || [],
  };
}

function parsePositiveInteger(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getDailyReference(dayNumber) {
  let offset = dayNumber % GITA_VERSE_TOTAL;
  for (let chapterIndex = 0; chapterIndex < GITA_VERSE_COUNTS.length; chapterIndex += 1) {
    const verseCount = GITA_VERSE_COUNTS[chapterIndex];
    if (offset < verseCount) {
      return { chapterNumber: chapterIndex + 1, verseNumber: offset + 1 };
    }
    offset -= verseCount;
  }
  return { chapterNumber: 1, verseNumber: 1 };
}

async function sendSourceVerses(sourceId, res, next) {
  try {
    if (!SOURCE_IDS.has(sourceId)) {
      return res.status(404).json({ error: 'Source not found.' });
    }

    const snap = await collections.verses()
      .where('source_id', '==', sourceId)
      .get();

    const verses = snap.docs
      .map((doc) => ({ id: doc.id, ...withoutEmbedding(doc.data()) }))
      .sort((a, b) => {
        if (a.chapterNumber !== b.chapterNumber) {
          return a.chapterNumber - b.chapterNumber;
        }
        return a.verseNumber - b.verseNumber;
      });

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.json({ verses });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/verses/daily
 * Intelligently returns a "Daily Darshan" verse that changes every day,
 * using zero AI credits and one cached database read per server process each day.
 */
router.get('/daily', async (_req, res, next) => {
  // Deterministic daily selection based on UTC days since epoch.
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  try {
    if (!dailyCache || dailyCache.day !== daysSinceEpoch) {
      const { chapterNumber, verseNumber } = getDailyReference(daysSinceEpoch);
      const verse = await getDoc('verses', `bhagavad-gita_${chapterNumber}_${verseNumber}`);
      if (!verse) {
        const error = new Error('Daily verse is unavailable.');
        error.status = 503;
        throw error;
      }
      dailyCache = {
        day: daysSinceEpoch,
        verse: toVerseSummary(verse),
      };
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.json({ verse: dailyCache.verse });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/verses/ramayana/:kandaNumber/:sarga
 * Returns all verses for a given Kanda and Sarga in the Ramayana.
 */
router.get('/ramayana/:kandaNumber/:sarga', async (req, res, next) => {
  try {
    const kandaNum = parseInt(req.params.kandaNumber, 10);
    const sarga = parseInt(req.params.sarga, 10);

    if (
      !parsePositiveInteger(req.params.kandaNumber)
      || !parsePositiveInteger(req.params.sarga)
      || kandaNum > 7
    ) {
      return res.status(400).json({ error: 'Kanda and sarga must be valid positive numbers.' });
    }

    const snap = await collections.verses()
      .where('book', '==', 'ramayana')
      .where('kandaNumber', '==', kandaNum)
      .where('sarga', '==', sarga)
      .get();

    const verses = snap.docs
      .map((doc) => {
        return { id: doc.id, ...withoutEmbedding(doc.data()) };
      })
      .sort((a, b) => a.shlokaNumber - b.shlokaNumber);

    res.json({ verses });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/verses/source/:sourceId
 * Returns all verses for a source. The explicit path avoids confusing source
 * identifiers with individual verse document IDs.
 */
router.get('/source/:sourceId', (req, res, next) => {
  return sendSourceVerses(req.params.sourceId, res, next);
});

/**
 * GET /api/verses/:id
 * Returns one verse by Firestore document ID.
 * Known source IDs are retained as a compatibility alias.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (SOURCE_IDS.has(id)) {
      return sendSourceVerses(id, res, next);
    }
    if (!id || id.length > 256) {
      return res.status(400).json({ error: 'Invalid verse ID.' });
    }

    const verse = await getDoc('verses', id);
    if (!verse) return res.status(404).json({ error: 'Verse not found.' });

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.json(withoutEmbedding(verse));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

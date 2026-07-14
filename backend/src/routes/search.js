const express = require('express');
const { embedText } = require('../services/embedding');
const { findNearestVerses, getDoc } = require('../services/firestore');

const router = express.Router();

/**
 * GET /api/search?q=<query>&limit=<n>
 *
 * Semantic search: embeds the query and runs KNN against all verse embeddings.
 * This is the same vector retrieval used by /ask, but without the LLM step —
 * results are returned directly as ranked verse cards.
 *
 * Falls back gracefully if the query is too short to embed meaningfully.
 *
 * Query params:
 *   q      {string} - The search query (required, min 3 chars)
 *   limit  {number} - Max results to return (default 10, max 20)
 */
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 3) {
      return res.status(400).json({ error: 'Query must be at least 3 characters.' });
    }

    const limit = Math.min(parseInt(req.query.limit || '10', 10), 20);

    // Embed as RETRIEVAL_QUERY for better cross-lingual matching
    const queryVector = await embedText(q, 'RETRIEVAL_QUERY');

    // Retrieve more than needed so we can filter by a soft threshold
    let results = await findNearestVerses(queryVector, Math.min(limit * 2, 20));

    // INTERCEPT 1: Bhagavad Gita (e.g. "chapter 1 verse 1")
    const explicitGita = q.match(/chapter\s+(\d+)(?:\s*,?\s*|\s+and\s+)verse\s+(\d+)/i);
    if (explicitGita) {
      const ch = parseInt(explicitGita[1], 10);
      const vNum = parseInt(explicitGita[2], 10);
      const exactDoc = await getDoc('verses', `bhagavad-gita_${ch}_${vNum}`);
      if (exactDoc) {
        results = results.filter(v => v.id !== exactDoc.id);
        results.unshift({
          id: exactDoc.id,
          similarity: 1.0,
          chapterNumber: exactDoc.chapterNumber,
          verseNumber: exactDoc.verseNumber,
          sanskrit: exactDoc.sanskrit,
          transliteration: exactDoc.transliteration,
          translationEnglish: exactDoc.translationEnglish,
          translationHindi: exactDoc.translationHindi,
          wordMeanings: exactDoc.wordMeanings,
          detailedExplanations: exactDoc.detailedExplanations,
          tags: exactDoc.tags || []
        });
      }
    }

    // INTERCEPT 2: Ramayana (e.g. "kanda 1 sarga 1 shloka 1")
    const explicitRamayana = q.match(/kanda\s+(\d+)(?:\s*,?\s*|\s+and\s+)sarga\s+(\d+)(?:\s*,?\s*|\s+and\s+)(?:shloka|verse)\s+(\d+)/i);
    if (explicitRamayana) {
      const kNum = parseInt(explicitRamayana[1], 10);
      const sarga = parseInt(explicitRamayana[2], 10);
      const shloka = parseInt(explicitRamayana[3], 10);
      const exactDoc = await getDoc('verses', `valmiki-ramayana_${kNum}_${sarga}_${shloka}`);
      if (exactDoc) {
        results = results.filter(v => v.id !== exactDoc.id);
        results.unshift({
          id: exactDoc.id,
          similarity: 1.0,
          book: exactDoc.book,
          kanda: exactDoc.kanda,
          kandaNumber: exactDoc.kandaNumber,
          sarga: exactDoc.sarga,
          shlokaNumber: exactDoc.shlokaNumber,
          sanskrit: exactDoc.sanskrit,
          transliteration: exactDoc.transliteration,
          translationEnglish: exactDoc.translationEnglish,
          explanationEnglish: exactDoc.explanationEnglish,
          comments: exactDoc.comments,
          verified: exactDoc.verified,
          tags: exactDoc.tags || []
        });
      }
    }

    // Apply a softer threshold for search (more permissive than /ask)
    const SEARCH_THRESHOLD = 0.55;
    const filtered = results
      .filter(v => v.similarity >= SEARCH_THRESHOLD)
      .slice(0, limit);

    res.json({
      query: q,
      total: filtered.length,
      results: filtered,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

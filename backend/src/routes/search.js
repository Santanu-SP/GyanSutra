const express = require('express');
const { embedText } = require('../services/embedding');
const { findNearestVerses } = require('../services/firestore');

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
    const results = await findNearestVerses(queryVector, Math.min(limit * 2, 20));

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

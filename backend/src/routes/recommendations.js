const express = require('express');
const { embedText } = require('../services/embedding');
const { findNearestVerses, collections } = require('../services/firestore');

const router = express.Router();

const RECO_TOP_K = 10;      // Retrieve more, filter down
const RECO_RETURN = 6;      // Return at most 6
const RECO_THRESHOLD = 0.60; // Minimum similarity for a recommendation

/**
 * GET /api/recommendations/:contentId
 *
 * Returns 4–6 "Related teachings" for a given verse or story.
 * Uses cosine similarity against the same embedding store — no separate ML system.
 *
 * :contentId is a Firestore document ID:
 *   - Verses: "1_47" (chapter_verse)
 *   - Stories: Firestore auto-ID
 *
 * The endpoint:
 *   1. Fetches the source document and reads its stored embedding
 *   2. Runs findNearest with that embedding (avoids a re-embedding API call)
 *   3. Filters out the source document itself, applies threshold, returns top results
 *
 * Query params:
 *   type  {'verse' | 'story'} - defaults to 'verse'
 */
router.get('/:contentId', async (req, res, next) => {
  try {
    const { contentId } = req.params;
    const type = req.query.type === 'story' ? 'story' : 'verse';

    // Step 1: Fetch the source document to get its embedding
    const colRef = type === 'story' ? collections.stories() : collections.verses();
    const sourceDoc = await colRef.doc(contentId).get();

    if (!sourceDoc.exists) {
      return res.status(404).json({ error: `${type} not found.` });
    }

    const sourceData = sourceDoc.data();
    const sourceEmbedding = sourceData.embedding;

    if (!sourceEmbedding || !Array.isArray(sourceEmbedding.arrayValue?.values ?? sourceEmbedding)) {
      // Embedding might not be stored yet (e.g. old doc) — fall back gracefully
      return res.json({ contentId, recommendations: [] });
    }

    // Normalise Firestore vector field to plain number[]
    const queryVector = Array.isArray(sourceEmbedding)
      ? sourceEmbedding
      : (sourceEmbedding.arrayValue?.values ?? []).map(v => v.doubleValue ?? 0);

    // Step 2: Find nearest verses (always recommend verses, even for story sources)
    const nearest = await findNearestVerses(queryVector, RECO_TOP_K + 1);

    // Step 3: Filter out the source document itself and apply threshold
    const recommendations = nearest
      .filter(v => v.id !== contentId && v.similarity >= RECO_THRESHOLD)
      .slice(0, RECO_RETURN);

    res.json({ contentId, recommendations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

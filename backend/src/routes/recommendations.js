const express = require('express');
const { findNearestVerses, collections } = require('../services/firestore');

const router = express.Router();

const RECO_TOP_K = 10;      // Retrieve more, filter down
const RECO_RETURN = 6;      // Return at most 6
const RECO_THRESHOLD = 0.60; // Minimum similarity for a recommendation

function toPlainVector(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value.toArray === 'function') return value.toArray();

  const firestoreValues = value?.arrayValue?.values;
  if (Array.isArray(firestoreValues)) {
    return firestoreValues.map((item) => item.doubleValue ?? item.integerValue);
  }

  return null;
}

/**
 * GET /api/recommendations/:contentId
 *
 * Returns 4–6 "Related teachings" for a given verse or story.
 * Uses cosine similarity against the same embedding store - no separate ML system.
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

    if (!contentId || contentId.length > 256) {
      return res.status(400).json({ error: 'Invalid content ID.' });
    }

    // Step 1: Fetch the source document to get its embedding
    const colRef = type === 'story' ? collections.stories() : collections.verses();
    const sourceDoc = await colRef.doc(contentId).get();

    if (!sourceDoc.exists) {
      return res.status(404).json({ error: `${type} not found.` });
    }

    const sourceData = sourceDoc.data();
    const queryVector = toPlainVector(sourceData.embedding);

    if (
      !queryVector
      || queryVector.length !== 384
      || queryVector.some((value) => !Number.isFinite(Number(value)))
      || queryVector.every((value) => Number(value) === 0)
    ) {
      // Embedding might not be stored yet (e.g. old doc) - fall back gracefully
      return res.json({ contentId, recommendations: [] });
    }

    // Step 2: Find nearest verses (always recommend verses, even for story sources)
    const nearest = await findNearestVerses(queryVector.map(Number), RECO_TOP_K + 1);

    // Step 3: Filter out the source document itself and apply threshold
    const recommendations = nearest
      .filter(v => v.id !== contentId && v.similarity >= RECO_THRESHOLD)
      .slice(0, RECO_RETURN)
      .map((verse) => {
        const {
          comments: _comments,
          detailedExplanations: _detailedExplanations,
          wordMeanings: _wordMeanings,
          ...summary
        } = verse;
        return summary;
      });

    res.json({ contentId, recommendations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

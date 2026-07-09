const express = require('express');
const { collections } = require('../services/firestore');

const router = express.Router();

/**
 * GET /api/verses/:source_id
 * Returns all verses for a given source_id.
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

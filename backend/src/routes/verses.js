const express = require('express');
const { collections } = require('../services/firestore');

const router = express.Router();

/**
 * GET /api/verses/:id
 * Returns a single verse by its Firestore document ID (e.g. "1_47").
 * Strips the embedding vector — client never needs 768 floats.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await collections.verses().doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Verse not found.' });

    const data = doc.data();
    delete data.embedding;
    res.json({ id: doc.id, ...data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

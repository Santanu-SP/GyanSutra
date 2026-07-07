const express = require('express');
const { collections } = require('../services/firestore');

const router = express.Router();

/**
 * GET /api/chapters
 * Returns all 18 chapters, ordered by chapter number.
 */
router.get('/', async (_req, res, next) => {
  try {
    const snap = await collections.chapters().orderBy('number').get();
    const chapters = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ chapters });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/chapters/:id
 * Returns a single chapter document by its Firestore ID (e.g. "chapter_1").
 */
router.get('/:id', async (req, res, next) => {
  try {
    const doc = await collections.chapters().doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Chapter not found.' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/chapters/:id/verses
 * Returns all verses for a chapter, ordered by verse number.
 * Strips the embedding vector from the response (not needed for reading).
 */
router.get('/:id/verses', async (req, res, next) => {
  try {
    // Chapter IDs are "chapter_1", "chapter_2", etc.
    // Verses store chapterNumber as an integer.
    const chapterDoc = await collections.chapters().doc(req.params.id).get();
    if (!chapterDoc.exists) return res.status(404).json({ error: 'Chapter not found.' });

    const { number } = chapterDoc.data();
    const snap = await collections.verses()
      .where('chapterNumber', '==', number)
      .orderBy('verseNumber')
      .get();

    const verses = snap.docs.map(doc => {
      const data = doc.data();
      delete data.embedding; // Strip vector — client never needs it
      return { id: doc.id, ...data };
    });

    res.json({ chapterNumber: number, verses });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

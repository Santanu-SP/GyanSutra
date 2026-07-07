const express = require('express');
const { askRag, logQaCall } = require('../services/rag');

const router = express.Router();

/**
 * POST /api/ask
 * Body: { question: string }
 *
 * The RAG endpoint — the core of Gyan Sutra's AI layer.
 *
 * Pipeline (enforced in rag.js):
 *   1. Embed the question
 *   2. Retrieve top-K verses via Firestore KNN
 *   3. If no verse clears the similarity threshold → return refusal (LLM NOT called)
 *   4. Otherwise → build grounded context → call Gemini Flash → return answer + citations
 *
 * Response:
 *   {
 *     answered: boolean,
 *     answer: string,
 *     citations: Array<{ id, chapterNumber, verseNumber, sanskrit, translationEnglish, translationHindi, similarity }>,
 *     topSimilarity: number
 *   }
 */
router.post('/', async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a question (at least 5 characters).' });
    }

    if (question.trim().length > 500) {
      return res.status(400).json({ error: 'Question is too long (max 500 characters).' });
    }

    const trimmed = question.trim();
    const result = await askRag(trimmed);

    // Fire-and-forget QA log — non-blocking
    logQaCall({
      question: trimmed,
      retrievedVerseIds: result.citations.map(c => c.id),
      wasAnswered: result.answered,
    });

    res.json(result);
  } catch (err) {
    // Surface embedding/generation errors cleanly
    if (err.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }
    next(err);
  }
});

module.exports = router;

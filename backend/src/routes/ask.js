const express = require('express');
const { askRag, logQaCall } = require('../services/rag');

const router = express.Router();

/**
 * POST /api/ask
 * Body: {
 *   question: string,
 *   history?: Array<{ role: 'user'|'sarathi', content: string }>,
 *   contextIds?: string[]
 * }
 *
 * The RAG endpoint - the core of Gyan Sutra's AI layer.
 *
 * Pipeline (enforced in rag.js):
 *   1. Embed the question
 *   2. Retrieve top-K verses via Firestore KNN
 *   3. If no verse clears the threshold, return a useful no-evidence response
 *      without spending model credits.
 *   4. Otherwise, generate within a strict provider/timeout/token budget.
 *   5. If generation is unavailable, return a cited extractive response.
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
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }

    const { question, history, contextIds, language } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a question (at least 5 characters).' });
    }

    if (question.trim().length > 500) {
      return res.status(400).json({ error: 'Question is too long (max 500 characters).' });
    }

    // history is optional - validate shape if provided
    // Only keep last 2 exchanges (4 messages) to save input tokens while preserving follow-up context
    let safeHistory = Array.isArray(history)
      ? history
          .filter(m => m && (m.role === 'user' || m.role === 'sarathi') && typeof m.content === 'string')
          .map(m => ({ role: m.role, content: m.content.trim().slice(0, 1000) }))
          .filter(m => m.content)
      : [];

    const trimmed = question.trim();
    if (
      safeHistory.at(-1)?.role === 'user'
      && safeHistory.at(-1)?.content === trimmed
    ) {
      safeHistory.pop();
    }
    safeHistory = safeHistory.slice(-4);

    const safeContextIds = Array.isArray(contextIds)
      ? [...new Set(contextIds
          .filter(id => typeof id === 'string')
          .map(id => id.trim())
          .filter(id => /^(bhagavad-gita|valmiki-ramayana)_\d+_\d+(?:_\d+)?$/.test(id)))]
          .slice(0, 4)
      : [];

    const safeLanguage = ['en', 'hi', 'bn', 'mr', 'te', 'ta'].includes(language) ? language : 'en';
    const result = language === undefined
      ? await askRag(trimmed, safeHistory, safeContextIds)
      : await askRag(trimmed, safeHistory, safeContextIds, safeLanguage);
    const { _diagnostics: diagnostics, ...publicResult } = result;

    // Fire-and-forget QA log - non-blocking
    void logQaCall({
      question: trimmed,
      retrievedVerseIds: result.citations.map(c => c.id),
      wasAnswered: result.answered,
      degraded: result.degraded,
      reason: result.reason,
      diagnostics,
    });

    res.set('Cache-Control', 'no-store');
    res.json(publicResult);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

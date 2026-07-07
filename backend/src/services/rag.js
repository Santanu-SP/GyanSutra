/**
 * RAG Service — Retrieve-Augment-Generate pipeline
 *
 * This module enforces the hard contract from the product spec:
 *
 *   1. Embed the user's question.
 *   2. Retrieve the top-K nearest verses via Firestore KNN.
 *   3. Check: does ANY retrieved verse meet the similarity threshold?
 *      → NO:  return a refusal object. THE LLM IS NEVER CALLED.
 *      → YES: build a grounded context and call Gemini Flash.
 *   4. The system prompt for generation is a hard instruction — not a suggestion.
 *      The LLM is told: cite chapter/verse, never speculate, never editorialize.
 *
 * The threshold check is in CODE, not in a prompt. A model that ignores its own
 * refusal instruction cannot bypass this — the function returns before the API call.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { embedText } = require('./embedding');
const { findNearestVerses, collections } = require('./firestore');

// ── Constants ─────────────────────────────────────────────────────────────────
const SIMILARITY_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.72');
const TOP_K = parseInt(process.env.RAG_TOP_K || '8', 10);

// The refusal string the client will display in the empty state.
// Phrased calmly — not as an error, just as an honest limitation.
const REFUSAL_ANSWER =
  "Gyan Sutra doesn't have a grounded answer for this yet. " +
  "The verses in the current database don't contain a clear teaching on this question. " +
  "Try rephrasing, or explore the chapters directly.";

// ── Generation Model ──────────────────────────────────────────────────────────
let generativeModel;
function getGenerativeModel() {
  if (!generativeModel) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    generativeModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_GENERATION_MODEL || 'gemini-2.0-flash',
    });
  }
  return generativeModel;
}

// ── System Prompt ─────────────────────────────────────────────────────────────
// This is a hard instruction string, embedded in code as specified in the product brief.
// It is NOT a comment; it is the actual system prompt sent to the model every call.
const SYSTEM_PROMPT = `You are Gyan Sutra's scripture guide. Your role is strictly limited:

RULES — follow these without exception:
1. Only use the verses provided in the retrieved context below. Do not use any outside knowledge.
2. Cite chapter and verse number for every claim you make (e.g., "Chapter 2, Verse 47").
3. If the context below does not contain a clear answer to the question, say EXACTLY this:
   "Gyan Sutra doesn't have a grounded answer for this yet." — then stop. Do not add anything else.
4. Do not speculate, paraphrase beyond what is in the text, offer your own interpretation, or provide moral advice.
5. Do not soften a refusal into a vague spiritual-sounding answer. A clear "I don't know from these verses" is correct. A vague guess is not.
6. Do not reference sources, traditions, scholars, or commentaries outside the retrieved verses.
7. Respond in the same language the user asked the question in (English or Hindi). Keep the answer concise.

Retrieved context follows:`;

// ── Main RAG Function ─────────────────────────────────────────────────────────
/**
 * @param {string} question - The user's natural language question
 * @returns {Promise<{
 *   answered: boolean,
 *   answer: string,
 *   citations: Array<{id, chapterNumber, verseNumber, sanskrit, translationEnglish, translationHindi, similarity}>,
 *   topSimilarity: number
 * }>}
 */
async function askRag(question) {
  // Step 1: Embed the question (RETRIEVAL_QUERY task type for better accuracy)
  const queryVector = await embedText(question, 'RETRIEVAL_QUERY');

  // Step 2: Retrieve top-K nearest verses from Firestore
  const retrieved = await findNearestVerses(queryVector, TOP_K);

  // Step 3: Threshold gate — if nothing is close enough, SKIP THE LLM ENTIRELY
  const topSimilarity = retrieved.length > 0 ? retrieved[0].similarity : 0;
  const passedThreshold = retrieved.filter(v => v.similarity >= SIMILARITY_THRESHOLD);

  if (passedThreshold.length === 0) {
    return {
      answered: false,
      answer: REFUSAL_ANSWER,
      citations: [],
      topSimilarity,
    };
  }

  // Step 4: Build grounded context string from retrieved verses
  const contextLines = passedThreshold.map((v, i) => {
    const wordMeanings = Array.isArray(v.wordMeanings)
      ? v.wordMeanings.map(w => `${w.word} = ${w.meaning}`).join(', ')
      : '';
    return [
      `[${i + 1}] Chapter ${v.chapterNumber}, Verse ${v.verseNumber} (similarity: ${v.similarity.toFixed(3)})`,
      `Sanskrit: ${v.sanskrit || ''}`,
      `Transliteration: ${v.transliteration || ''}`,
      `English: ${v.translationEnglish || ''}`,
      `Hindi: ${v.translationHindi || ''}`,
      wordMeanings ? `Word meanings: ${wordMeanings}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }).join('\n\n---\n\n');

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextLines}\n\nQuestion: ${question}`;

  // Step 5: Call Gemini Flash with the grounded context
  const model = getGenerativeModel();
  const result = await model.generateContent(fullPrompt);
  const answer = result.response.text().trim();

  // Step 6: Return answer + citations (without the embedding vector)
  const citations = passedThreshold.map(v => ({
    id: v.id,
    chapterNumber: v.chapterNumber,
    verseNumber: v.verseNumber,
    sanskrit: v.sanskrit,
    transliteration: v.transliteration,
    translationEnglish: v.translationEnglish,
    translationHindi: v.translationHindi,
    similarity: v.similarity,
    tags: v.tags || [],
  }));

  return { answered: true, answer, citations, topSimilarity };
}

/**
 * Log every /ask call to Firestore for offline review.
 * Runs fire-and-forget — don't await in the request handler.
 */
async function logQaCall({ question, retrievedVerseIds, wasAnswered }) {
  try {
    await collections.qaLog().add({
      question,
      retrievedVerseIds,
      wasAnswered,
      timestamp: new Date(),
    });
  } catch (e) {
    // Non-fatal — log but don't surface to client
    console.error('[qaLog] Failed to write log:', e.message);
  }
}

module.exports = { askRag, logQaCall, REFUSAL_ANSWER, SIMILARITY_THRESHOLD };

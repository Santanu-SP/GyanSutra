/**
 * RAG Service — Retrieve-Augment-Generate pipeline
 * Integrated with OpenRouter Free Tier Multi-Model Architecture
 */

const { OpenAI } = require('openai');
const { embedText } = require('./embedding');
const { findNearestVerses, collections, getDoc } = require('./firestore');

// ── Constants ─────────────────────────────────────────────────────────────────
const SIMILARITY_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.72');
const TOP_K = parseInt(process.env.RAG_TOP_K || '8', 10);

const REFUSAL_ANSWER =
  "Gyan Sutra doesn't have a grounded answer for this yet. " +
  "The verses in the current database don't contain a clear teaching on this question. " +
  "Try rephrasing, or explore the chapters directly.";

// ── OpenRouter Client Initialization ──────────────────────────────────────────
let openaiClient;
function getOpenRouterClient() {
  if (!openaiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('API Key missing inside .env configurations.');
    openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return openaiClient;
}

// ── System Prompt ─────────────────────────────────────────────────────────────
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
  // Step 1: Embed the question
  const queryVector = await embedText(question, 'RETRIEVAL_QUERY');

  // Step 2: Retrieve top-K nearest verses from Firestore
  let retrieved = await findNearestVerses(queryVector, TOP_K);

  // Step 2.5: Explicit Chapter/Verse Match override
  // If the user explicitly asks for "Chapter X Verse Y", vector search might fail semantically.
  // We intercept this and forcefully fetch the exact document.
  const explicitMatch = question.match(/chapter\s+(\d+)(?:\s*,?\s*|\s+and\s+)verse\s+(\d+)/i);
  if (explicitMatch) {
    const ch = parseInt(explicitMatch[1], 10);
    const vNum = parseInt(explicitMatch[2], 10);
    const exactDoc = await getDoc('verses', `bhagavad-gita_${ch}_${vNum}`);
    
    if (exactDoc) {
      const existingIdx = retrieved.findIndex(v => v.id === exactDoc.id);
      if (existingIdx > -1) {
        retrieved.splice(existingIdx, 1);
      }
      // Force it to the top with a guaranteed similarity of 1.0
      retrieved.unshift({
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
        tags: exactDoc.tags
      });
    }
  }

  // Step 3: Threshold gate
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

  // Step 4: Build grounded context string
  const contextLines = passedThreshold.map((v, i) => {
    const wordMeanings = Array.isArray(v.wordMeanings)
      ? v.wordMeanings.map(w => `${w.word} = ${w.meaning}`).join(', ')
      : '';
      
    const explanations = Array.isArray(v.detailedExplanations) && v.detailedExplanations.length > 0
      ? v.detailedExplanations.map(exp => `[Commentary by ${exp.author}]: ${exp.explanation}`).join('\n')
      : '';

    return [
      `[${i + 1}] Chapter ${v.chapterNumber}, Verse ${v.verseNumber} (similarity: ${v.similarity.toFixed(3)})`,
      `Sanskrit: ${v.sanskrit || ''}`,
      `Transliteration: ${v.transliteration || ''}`,
      `English: ${v.translationEnglish || ''}`,
      `Hindi: ${v.translationHindi || ''}`,
      wordMeanings ? `Word meanings: ${wordMeanings}` : '',
      explanations ? `Detailed Explanations:\n${explanations}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }).join('\n\n---\n\n');

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextLines}\n\nQuestion: ${question}`;
  const openai = getOpenRouterClient();
  let answer = "";

  // Check if the user is explicitly requesting a multi-model comparison view
  const isCompareMode = question.toLowerCase().trim().startsWith('[compare]');

  if (isCompareMode) {
    // ── APPROACH B: Simultaneous Multi-Model Comparison Execution ──
    const cleanQuestion = question.replace(/^\[compare\]/i, '').trim();
    const specificPrompt = `${SYSTEM_PROMPT}\n\n${contextLines}\n\nQuestion: ${cleanQuestion}`;

    const targetModels = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-2-9b-it:free',
      'openai/gpt-oss-120b:free'
    ];

    console.log(`[RAG] Running Approach B: Parallel generation over ${targetModels.length} models.`);

    const requests = targetModels.map(modelId =>
      openai.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: specificPrompt }],
      }).then(res => ({
        name: modelId.split('/')[1].split(':')[0].toUpperCase(),
        text: res.choices[0].message.content.trim()
      })).catch(err => ({
        name: modelId.split('/')[1].split(':')[0].toUpperCase(),
        text: `Failed to load response: ${err.message}`
      }))
    );

    const responses = await Promise.all(requests);

    // Stitch the comparison data nicely with Markdown headers
    answer = responses.map(r => `## 🤖 Response from ${r.name}\n${r.text}`).join('\n\n---\n\n');

  } else {
    // ── APPROACH A: High-Reliability Single Free-Model Router ──
    console.log('[RAG] Running Approach A: Smart Free-Routing Path.');
    const response = await openai.chat.completions.create({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: fullPrompt }],
    });
    answer = response.choices[0].message.content.trim();
  }

  // Step 6: Map Citations back safely
  const citations = passedThreshold.map(v => ({
    id: v.id,
    chapterNumber: v.chapterNumber,
    verseNumber: v.verseNumber,
    sanskrit: v.sanskrit,
    transliteration: v.transliteration,
    translationEnglish: v.translationEnglish,
    translationHindi: v.translationHindi,
    detailedExplanations: v.detailedExplanations || [],
    similarity: v.similarity,
    tags: v.tags || [],
  }));

  return { answered: true, answer, citations, topSimilarity };
}

/**
 * Log every /ask call to Firestore for offline review.
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
    console.error('[qaLog] Failed to write log:', e.message);
  }
}

module.exports = { askRag, logQaCall, REFUSAL_ANSWER, SIMILARITY_THRESHOLD };
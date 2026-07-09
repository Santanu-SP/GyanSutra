/**
 * Gemini Embedding Service
 *
 * Wraps the Google Generative AI SDK's embedding endpoint.
 * Called during ingestion (batch) and at query time (single).
 *
 * Model: text-embedding-004 (768 dimensions, stable)
 * Docs: https://ai.google.dev/gemini-api/docs/embeddings
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const EMBEDDING_DIMENSIONS = 768;

// Lazy-initialise so we don't crash during test imports with no API key
let genAI;
let embeddingModel;

function getEmbeddingModel() {
  if (!embeddingModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    });
  }
  return embeddingModel;
}

function normalizeEmbeddingValues(values) {
  if (!Array.isArray(values)) {
    throw new Error('Embedding response did not contain a valid values array.');
  }
  return values.slice(0, EMBEDDING_DIMENSIONS);
}

/**
 * Generate a single embedding vector for a text string.
 * Returns a number[] of length 768.
 *
 * @param {string} text - The text to embed
 * @param {'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY'} taskType
 */
async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
  const model = getEmbeddingModel();
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType,
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });
  return normalizeEmbeddingValues(result.embedding.values);
}

/**
 * Batch-embed an array of texts, respecting the API rate limit.
 * The free tier allows ~1500 RPM, but we throttle conservatively at 60/min
 * to avoid hitting bursting limits during ingestion.
 *
 * @param {string[]} texts
 * @param {number} delayMs - Delay between calls in ms (default 100ms → ~600 RPM)
 * @returns {number[][]} - Array of embedding vectors
 */
async function batchEmbedTexts(texts, delayMs = 100) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    const vec = await embedText(texts[i], 'RETRIEVAL_DOCUMENT');
    embeddings.push(vec);
    if (i < texts.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    if ((i + 1) % 50 === 0) {
      console.log(`[Embedding] ${i + 1}/${texts.length} complete`);
    }
  }
  return embeddings;
}

/**
 * Build the canonical embedding text for a verse.
 * We concatenate the most semantically rich fields so the vector captures
 * both the original Sanskrit meaning and the translated content.
 * Word meanings are especially useful for rare Sanskrit terms.
 */
function buildVerseEmbeddingText(verse) {
  const wordMeaningStr = Array.isArray(verse.wordMeanings)
    ? verse.wordMeanings.map(w => `${w.word}: ${w.meaning}`).join('; ')
    : '';

  return [
    verse.translationEnglish || '',
    verse.translationHindi || '',
    verse.transliteration || '',
    wordMeaningStr,
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = { embedText, batchEmbedTexts, buildVerseEmbeddingText };

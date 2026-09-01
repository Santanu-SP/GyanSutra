/**
 * Embedding Service - runs a transformer model locally.
 * Outputs native 384-dimensional vectors matching your Firestore setup.
 */

const crypto = require('crypto');
const path = require('path');
const { TTLCache } = require('./cache');

let pipelinePromise = null;
let pipelineReady = false;

function positiveIntegerFromEnv(name, fallback, maximum) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
}

const EMBEDDING_MODEL_ID = (process.env.EMBEDDING_MODEL_ID || 'Xenova/gte-small').trim();
const EMBEDDING_DIMENSIONS = positiveIntegerFromEnv('EMBEDDING_DIMENSIONS', 384, 2048);
const EMBEDDING_QUERY_PREFIX = process.env.EMBEDDING_QUERY_PREFIX || '';
const EMBEDDING_PASSAGE_PREFIX = process.env.EMBEDDING_PASSAGE_PREFIX || '';
const embeddingCache = new TTLCache({
  maxEntries: positiveIntegerFromEnv('EMBEDDING_CACHE_MAX_ENTRIES', 500, 5000),
  ttlMs: positiveIntegerFromEnv('EMBEDDING_CACHE_TTL_SECONDS', 86_400, 604_800) * 1000,
});

/**
 * Lazy-loads the local embedding pipeline execution instance
 */
async function getPipeline() {
  if (!pipelinePromise) {
    // Store the promise immediately so concurrent first requests share one model load.
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');

      // Use the committed model only. Production never depends on a model download.
      env.allowRemoteModels = false;
      env.localModelPath = path.resolve(__dirname, '../../models');

      console.log(`[Embedding] Loading ${EMBEDDING_MODEL_ID} into memory...`);
      const instance = await pipeline('feature-extraction', EMBEDDING_MODEL_ID, {
        dtype: 'q8',
      });
      pipelineReady = true;
      console.log('[Embedding] Local model successfully initialized.');
      return instance;
    })().catch((error) => {
      // A transient load failure should not permanently poison this process.
      pipelinePromise = null;
      pipelineReady = false;
      throw error;
    });
  }
  return pipelinePromise;
}

/**
 * Generates a text embedding vector array locally.
 * @param {string} text - The input query or verse string to vectorize
 * @param {{inputType?: 'query'|'passage'}} options
 * @returns {Promise<number[]>} - Returns a numerical vector array (384 dimensions)
 */
async function embedText(text, { inputType = 'query' } = {}) {
  try {
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Input text must be a valid, non-empty string.');
    }
    if (inputType !== 'query' && inputType !== 'passage') {
      throw new Error('Embedding inputType must be either query or passage.');
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    const prefix = inputType === 'passage' ? EMBEDDING_PASSAGE_PREFIX : EMBEDDING_QUERY_PREFIX;
    const preparedText = `${prefix}${normalized}`;
    const cacheKey = crypto
      .createHash('sha256')
      .update(`${EMBEDDING_MODEL_ID}\0${inputType}\0${preparedText}`)
      .digest('base64url');
    const cached = embeddingCache.get(cacheKey);
    if (cached) return cached.slice();

    const embedder = await getPipeline();

    // Generate local embeddings via ONNX runtime execution
    const output = await embedder(preparedText, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract raw JavaScript array numbers from the underlying Tensor object
    const vector = Array.from(output.data);
    if (vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
      throw new Error(`Embedding model returned an invalid ${vector.length}-value vector.`);
    }

    embeddingCache.set(cacheKey, vector);
    return vector.slice();

  } catch (error) {
    console.error('[Local Embedding Error]:', error.message);
    throw error;
  }
}

async function prewarmEmbedding() {
  await getPipeline();
}

function getEmbeddingStatus() {
  return {
    model: EMBEDDING_MODEL_ID,
    dimensions: EMBEDDING_DIMENSIONS,
    ready: pipelineReady,
    loading: Boolean(pipelinePromise && !pipelineReady),
    cachedEmbeddings: embeddingCache.size,
  };
}

module.exports = {
  EMBEDDING_DIMENSIONS,
  embedText,
  getEmbeddingStatus,
  prewarmEmbedding,
};

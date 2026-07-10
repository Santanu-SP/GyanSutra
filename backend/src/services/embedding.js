/**
 * Embedding Service — Runs a state-of-the-art transformer model locally.
 * 100% Free, Unlimited, 0ms Network Latency, and requires NO API Keys.
 * Outputs native 384-dimensional vectors matching your Firestore setup.
 */

let pipelineInstance = null;

/**
 * Lazy-loads the local embedding pipeline execution instance
 */
async function getPipeline() {
  if (!pipelineInstance) {
    // Dynamically import the transformers library
    const { pipeline } = await import('@xenova/transformers');

    console.log('[Embedding] Loading local 384-dim GTE model into memory...');
    pipelineInstance = await pipeline('feature-extraction', 'Xenova/gte-small');
    console.log('[Embedding] Local model successfully initialized.');
  }
  return pipelineInstance;
}

/**
 * Generates a text embedding vector array locally.
 * @param {string} text - The input query or verse string to vectorize
 * @returns {Promise<number[]>} - Returns a numerical vector array (384 dimensions)
 */
async function embedText(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Input text must be a valid, non-empty string.');
    }

    const embedder = await getPipeline();

    // Generate local embeddings via ONNX runtime execution
    const output = await embedder(text.replace(/\n/g, ' '), {
      pooling: 'mean',
      normalize: true,
    });

    // Extract raw JavaScript array numbers from the underlying Tensor object
    const vector = Array.from(output.data);

    return vector;

  } catch (error) {
    console.error('[Local Embedding Error]:', error.message);
    throw error;
  }
}

module.exports = { embedText };
/**
 * RAG Service — Retrieve-Augment-Generate pipeline for Gyan Sutra.
 * Fast, authentic, deeply grounded in Bhagavad Gita & Valmiki Ramayana.
 */

const { OpenAI } = require('openai');
const { embedText } = require('./embedding');
const { findNearestVerses, collections, getDoc } = require('./firestore');

// ── Constants ─────────────────────────────────────────────────────────────────
const SIMILARITY_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.65');
const TOP_K = parseInt(process.env.RAG_TOP_K || '6', 10);

// Fast, reliable models on OpenRouter (ordered by speed and reliability)
const FAST_MODELS = [
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'openrouter/free'
];

// ── OpenRouter Client Initialization ──────────────────────────────────────────
let openaiClient;
function getOpenRouterClient() {
  if (!openaiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('AI API Key is missing in backend configuration.');
    }
    openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.GEMINI_API_KEY,
      timeout: 12000, // 12-second hard timeout for fast response
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are Gyan Sutra's Sarathi (सारथि), the authentic and revered spiritual guide rooted in the Bhagavad Gita and Valmiki Ramayana.

CRITICAL RULES — ALWAYS FOLLOW WITHOUT EXCEPTION:

1. **SCRIPTURE GROUNDING & CONTEXT CLARITY**:
   - If the retrieved context contains relevant verses, explicitly cite the Book, Chapter/Kanda, and Verse/Shloka number (e.g., *Bhagavad Gita, Chapter 2, Verse 47* or *Valmiki Ramayana, Bala Kanda, Sarga 1, Shloka 1*).
   - If the user asks a question that is **NOT found or covered in the Bhagavad Gita or Valmiki Ramayana datasets**, you MUST start your response by explicitly informing the user:
     "⚠️ **Context Notice:** *This question is not directly found in the verses of the Bhagavad Gita or Valmiki Ramayana datasets.*"
   - If the topic is entirely secular or outside Sanatan scripture (e.g. modern technology, sports, coding), state clearly that the scripture does not address this topic.

2. **GURU & ACHARYA ATTRIBUTION**:
   - When explaining Bhagavad Gita verses, you MUST explicitly provide detailed explanations attributed to the revered Gurus and Acharyas present in the commentaries or tradition:
     - **According to Sri Adi Shankaracharya (Advaita)**: ...
     - **According to Sri Ramanujacharya (Vishishtadvaita)**: ...
     - **According to Sri Madhvacharya (Dvaita)**: ...
     - **According to Swami Sivananda**: ...
     - **According to Swami Chinmayananda**: ...
     - **According to Swami Ramsukhdas**: ...
   - Always state clearly which Guru provides which perspective: "**According to [Guru Name]...**".

3. **LANGUAGE & AUTHENTICITY**:
   - If the user asks in English, respond in articulate, respectful English.
   - If the user asks in Hindi (Devanagari or Hinglish/Roman Hindi), respond in pure Hindi (Devanagari script) with traditional respect.
   - Maintain the highest philosophical precision and respect for Vedantic and Itihasa traditions.

4. **FORMATTING & SPEED**:
   - Keep answers well-structured using clear markdown headers, bold spiritual terms, bullet points, and concise paragraphs for immediate readability.

Retrieved Context Follows:`;

/**
 * Execute LLM call with rapid timeout and model fallback
 */
async function callLlmWithFallback(fullPrompt, isCompareMode = false) {
  const openai = getOpenRouterClient();

  if (isCompareMode) {
    const compareModels = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-2-9b-it:free',
      'openai/gpt-oss-120b:free'
    ];
    const requests = compareModels.map(modelId =>
      openai.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.2,
        max_tokens: 1200,
      }).then(res => ({
        name: modelId.split('/')[1]?.split(':')[0]?.toUpperCase() || modelId,
        text: res.choices[0]?.message?.content?.trim() || 'No content'
      })).catch(err => ({
        name: modelId.split('/')[1]?.split(':')[0]?.toUpperCase() || modelId,
        text: `Unable to load: ${err.message}`
      }))
    );
    const responses = await Promise.all(requests);
    return responses.map(r => `## 🤖 Perspective from ${r.name}\n\n${r.text}`).join('\n\n---\n\n');
  }

  // Fast sequential fallback through optimized models
  let lastError = null;
  for (const model of FAST_MODELS) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.2,
        max_tokens: 1200,
      });

      let rawAnswer = response.choices[0]?.message?.content?.trim();
      if (rawAnswer) {
        // Clean OpenRouter / guard tags
        return rawAnswer
          .replace(/^User Safety:\s*safe\n*/i, '')
          .replace(/^Your Reflection\n*/i, '')
          .trim();
      }
    } catch (err) {
      lastError = err;
      console.warn(`[RAG] Model ${model} failed or timed out (${err.message}). Trying next...`);
    }
  }

  throw new Error(lastError ? `AI model connection failed: ${lastError.message}` : 'All AI models timed out.');
}

/**
 * Main RAG function
 */
async function askRag(question) {
  // Step 1: Embed the question
  let queryVector = [];
  try {
    queryVector = await embedText(question, 'RETRIEVAL_QUERY');
  } catch (embedErr) {
    console.error('[RAG] Embedding failed:', embedErr.message);
  }

  // Step 2: Retrieve top-K nearest verses from Firestore
  let retrieved = [];
  if (queryVector && queryVector.length > 0) {
    try {
      retrieved = await findNearestVerses(queryVector, TOP_K);
    } catch (dbErr) {
      console.error('[RAG] Vector retrieval failed:', dbErr.message);
    }
  }

  // Step 2.5: Explicit Chapter/Verse Match override
  const explicitMatch = question.match(/chapter\s+(\d+)(?:\s*,?\s*|\s+and\s+)verse\s+(\d+)/i);
  if (explicitMatch) {
    const ch = parseInt(explicitMatch[1], 10);
    const vNum = parseInt(explicitMatch[2], 10);
    const exactDoc = await getDoc('verses', `bhagavad-gita_${ch}_${vNum}`);

    if (exactDoc) {
      const existingIdx = retrieved.findIndex(v => v.id === exactDoc.id);
      if (existingIdx > -1) retrieved.splice(existingIdx, 1);
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

  // Step 2.6: Explicit Kanda/Sarga Match override (Ramayana)
  const explicitRamayana = question.match(/kanda\s+(\d+)(?:\s*,?\s*|\s+and\s+)sarga\s+(\d+)(?:\s*,?\s*|\s+and\s+)(?:shloka|verse)\s+(\d+)/i);
  if (explicitRamayana) {
    const kNum = parseInt(explicitRamayana[1], 10);
    const sarga = parseInt(explicitRamayana[2], 10);
    const shloka = parseInt(explicitRamayana[3], 10);
    const exactDoc = await getDoc('verses', `valmiki-ramayana_${kNum}_${sarga}_${shloka}`);

    if (exactDoc) {
      const existingIdx = retrieved.findIndex(v => v.id === exactDoc.id);
      if (existingIdx > -1) retrieved.splice(existingIdx, 1);
      retrieved.unshift({
        id: exactDoc.id,
        similarity: 1.0,
        book: exactDoc.book,
        kanda: exactDoc.kanda,
        kandaNumber: exactDoc.kandaNumber,
        sarga: exactDoc.sarga,
        shlokaNumber: exactDoc.shlokaNumber,
        sanskrit: exactDoc.sanskrit,
        transliteration: exactDoc.transliteration,
        translationEnglish: exactDoc.translationEnglish,
        explanationEnglish: exactDoc.explanationEnglish,
        comments: exactDoc.comments,
        verified: exactDoc.verified,
        tags: exactDoc.tags || []
      });
    }
  }

  // Step 3: Threshold and context construction
  const topSimilarity = retrieved.length > 0 ? (retrieved[0].similarity || 0) : 0;
  const passedThreshold = retrieved.filter(v => (v.similarity || 0) >= SIMILARITY_THRESHOLD);

  let contextLines = "";
  const isDirectlyInContext = passedThreshold.length > 0;

  if (!isDirectlyInContext) {
    contextLines = "[NOTICE]: No specific verses from the database match this query above the similarity threshold. The topic is NOT explicitly present in the retrieved dataset. You MUST alert the user that this is outside the specific verses of the dataset.";
  } else {
    contextLines = passedThreshold.map((v, i) => {
      const wordMeanings = Array.isArray(v.wordMeanings)
        ? v.wordMeanings.map(w => `${w.word} = ${w.meaning}`).join(', ')
        : '';

      const explanations = Array.isArray(v.detailedExplanations) && v.detailedExplanations.length > 0
        ? v.detailedExplanations.map(exp => `[Commentary by ${exp.author} (${exp.language || 'English'})]: ${exp.explanation}`).join('\n\n')
        : '';

      const titleLine = v.book === 'ramayana' || v.kanda
        ? `[Source ${i + 1}] Valmiki Ramayana, ${v.kanda || 'Kanda ' + v.kandaNumber}, Sarga ${v.sarga}, Shloka ${v.shlokaNumber} (match: ${((v.similarity || 1) * 100).toFixed(0)}%)`
        : `[Source ${i + 1}] Bhagavad Gita, Chapter ${v.chapterNumber}, Verse ${v.verseNumber} (match: ${((v.similarity || 1) * 100).toFixed(0)}%)`;

      return [
        titleLine,
        `Sanskrit: ${v.sanskrit || ''}`,
        `Transliteration: ${v.transliteration || ''}`,
        `English Translation: ${v.translationEnglish || ''}`,
        `Hindi Translation: ${v.translationHindi || ''}`,
        wordMeanings ? `Word Meanings: ${wordMeanings}` : '',
        explanations ? `Guru Commentaries:\n${explanations}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }).join('\n\n====================\n\n');
  }

  const isCompareMode = question.toLowerCase().trim().startsWith('[compare]');
  const cleanQuestion = isCompareMode ? question.replace(/^\[compare\]/i, '').trim() : question;
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextLines}\n\nUser Question: ${cleanQuestion}`;

  let answer = "";
  try {
    answer = await callLlmWithFallback(fullPrompt, isCompareMode);
  } catch (llmError) {
    console.error('[RAG] LLM Execution Error:', llmError.message);
    answer = `⚠️ **Sarathi Notification:**\n\nThe AI language service could not process your question at this moment (${llmError.message}).\n\nPlease check your internet connection or try asking again in a few moments.`;
  }

  // Step 6: Map Citations back safely
  const citations = passedThreshold.map(v => ({
    id: v.id,
    chapterNumber: v.chapterNumber,
    verseNumber: v.verseNumber,
    book: v.book,
    kanda: v.kanda,
    kandaNumber: v.kandaNumber,
    sarga: v.sarga,
    shlokaNumber: v.shlokaNumber,
    sanskrit: v.sanskrit,
    transliteration: v.transliteration,
    translationEnglish: v.translationEnglish,
    translationHindi: v.translationHindi,
    detailedExplanations: v.detailedExplanations || [],
    similarity: v.similarity,
    tags: v.tags || [],
  }));

  return {
    answered: true,
    inContext: isDirectlyInContext,
    answer,
    citations,
    topSimilarity
  };
}

/**
 * Log every /ask call to Firestore for analytics
 */
async function logQaCall({ question, retrievedVerseIds, wasAnswered }) {
  try {
    await collections.qaLog().add({
      question,
      retrievedVerseIds: retrievedVerseIds || [],
      wasAnswered: !!wasAnswered,
      timestamp: new Date(),
    });
  } catch (e) {
    // Non-blocking
  }
}

module.exports = { askRag, logQaCall, SIMILARITY_THRESHOLD };
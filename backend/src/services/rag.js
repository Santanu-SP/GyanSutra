/**
 * RAG Service — Retrieve-Augment-Generate pipeline for Gyan Sutra.
 * Fast, authentic, deeply grounded in Bhagavad Gita & Valmiki Ramayana.
 */

const { OpenAI } = require('openai');
const { embedText } = require('./embedding');
const { findNearestVerses, collections, getDoc } = require('./firestore');

// ── Constants ─────────────────────────────────────────────────────────────────
// Threshold below which retrieved verses are treated as "background context"
// (still passed to LLM, but model uses broader knowledge to answer).
// Set lower than 0.72 so more queries get verse-grounded answers.
const SIMILARITY_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.55');
const TOP_K                = parseInt(process.env.RAG_TOP_K || '6', 10);
const TOP_CONTEXT          = 3;    // max verses sent to LLM — keeps prompt compact
const MAX_COMMENTARY_CHARS = 400;  // truncate per-guru commentary — keeps token budget tight

// Primary + fallback model chain (ordered by quality → reliability)
// NOTE: Avoid thinking/reasoning models (e.g. gemini-flash-lite-preview, deepseek-r1)
// — they leak their chain-of-thought into the response text and consume max_tokens.
const FAST_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',   // Best free model — no thinking leakage, multilingual
  'meta-llama/llama-3.1-8b-instruct:free',    // Lightweight fallback
  'meta-llama/llama-3.2-3b-instruct:free',    // Smallest fallback
  'openrouter/free'                            // Last-resort wildcard
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
      timeout: 20000, // 20-second hard timeout — if a model is slow, move on
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are Sarathi (सारथि) — Gyan Sutra's spiritual guide. You are a master of the Bhagavad Gita and Valmiki Ramayana, revered for giving concise, complete, and deeply authentic answers.

STRICT RULES — EVERY ANSWER MUST FOLLOW THESE:

1. **CONCISE & COMPLETE**: 
   - Keep answers SHORT (150–300 words max for a typical question). 
   - NEVER write long academic essays. NEVER use tables. NEVER use headers for a simple question.  
   - Start directly with the answer. Skip all preamble ("Great question", "Let me explain", etc.).  
   - Every answer MUST be complete — never cut off mid-sentence or mid-thought.

2. **AUTHENTIC CITATIONS**:
   - Always cite specific verses when possible: "Bhagavad Gita 2.47 says…" or "Valmiki Ramayana, Yuddha Kanda…"
   - NEVER fabricate verse numbers. If unsure of a specific verse, say: "The Gita broadly teaches…"
   - If guru perspectives are directly relevant, mention 2–3 key ones briefly (1 sentence each). Do not list all 6 every time.

3. **ANSWER STRUCTURE** (use for moderate-to-complex questions only):
   - 1 short intro sentence stating the core teaching
   - The key verses with their meaning (1–2 max)
   - The practical/life takeaway in 2–3 sentences
   - If relevant, 1–2 guru perspectives in a brief bullet list

4. **ALWAYS ANSWER** spiritual, dharmic, philosophical, or devotional questions.  
   ONLY decline if the question is completely outside scripture (e.g., sports, technology, politics). Then say: "This falls outside the Gita and Ramayana."

5. **LANGUAGE**: English if asked in English. Pure Devanagari Hindi if asked in Hindi or Hinglish.

Retrieved Scripture Context:`;




/**
 * Strip chain-of-thought reasoning artifacts from free model responses.
 *
 * Some free/preview models (e.g. Gemini flash-lite, DeepSeek-R1) output their
 * internal reasoning before the answer. This function removes all known patterns:
 *   - XML-style <thinking>…</thinking> blocks
 *   - "Here's a thinking process:" / "Here is my thinking:" preambles
 *   - "Analyze User Input:" / "Check Rules Applicability:" meta-sections
 *   - OpenRouter safety / guard prefix tags
 *
 * @param {string} raw - The raw LLM response string
 * @returns {string} - The cleaned answer ready to display to the user
 */
function cleanResponse(raw) {
  let text = raw.trim();

  // 1. Strip XML-style thinking blocks entirely (DeepSeek-R1, Gemini thinking models)
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');

  // 2. Strip "Here's a thinking process:" / "Here is my thinking:" preamble sections.
  //    These models dump their reasoning as a prose block before the real answer.
  //    Strategy: find the preamble marker, then skip everything until the first
  //    real markdown heading or "📖" / "##" / "**" content starts.
  const thinkingPreamblePattern = /^(here(?:'s| is) (?:a |my |the )?thinking(?: process)?[:\-–—]?|let me think|analysis:|chain[- ]of[- ]thought:)/im;
  if (thinkingPreamblePattern.test(text)) {
    // Find the first line that looks like real structured output (heading, bold, emoji section)
    const realContentMatch = text.match(/(\n#{1,3} |\n\*{2}📖|\n📖|^\s*#{1,3} |\n---\n|\*{2}Scripture Reference|\*{2}Practical Life)/im);
    if (realContentMatch && realContentMatch.index > 0) {
      text = text.slice(realContentMatch.index).trim();
    }
  }

  // 3. Strip "Analyze User Input:" / "Check Rules Applicability:" reasoning sections.
  //    Pattern: line that starts with a step-label, followed by numbered reasoning.
  //    These appear when the system prompt rules are interpreted as a reasoning template.
  const metaSectionPattern = /^(analyze user input|check rules applicability|identify key constraints|step \d+:|user question:|user role:|rule \d+:|critical rules|output generation)/im;
  if (metaSectionPattern.test(text)) {
    // Find where actual answer content begins — after the meta-reasoning dump
    const answerStart = text.match(/(\n#{1,3} |\n📖|\n\*{2}📖|^📖|^\s*#{1,3} )/im);
    if (answerStart && answerStart.index > 0) {
      text = text.slice(answerStart.index).trim();
    } else {
      // Fallback: split on double newline, drop lines that are pure meta-reasoning
      const lines = text.split('\n');
      const firstRealLine = lines.findIndex(l =>
        /^#{1,3} |^📖|^\*{2}|^---$/.test(l.trim()) && l.trim().length > 3
      );
      if (firstRealLine > 0) {
        text = lines.slice(firstRealLine).join('\n').trim();
      }
    }
  }

  // 4. Strip known OpenRouter / safety guard prefixes
  text = text
    .replace(/^User Safety:\s*safe\n*/i, '')
    .replace(/^Your Reflection\n*/i, '')
    .replace(/^Assistant:\s*/i, '');

  return text.trim();
}

/**
 * Execute LLM call with rapid timeout and model fallback.
 * @param {Array<{role: string, content: string}>} chatMessages - Full chat messages array
 * @param {boolean} isCompareMode
 */
async function callLlmWithFallback(chatMessages, isCompareMode = false) {
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
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 1200, // compare mode — still needs reasonable length per model
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
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 900, // Enforces concise, complete answers — 900 tokens ≈ 600-700 words
      });

      let rawAnswer = response.choices[0]?.message?.content?.trim();
      if (rawAnswer) {
        return cleanResponse(rawAnswer);
      }
    } catch (err) {
      lastError = err;
      console.warn(`[RAG] Model ${model} failed or timed out (${err.message}). Trying next...`);
    }
  }

  throw new Error(lastError ? `AI model connection failed: ${lastError.message}` : 'All AI models timed out.');
}

/**
 * Main RAG function — Retrieve, Augment, Generate.
 *
 * Speed optimisation: explicit-match doc lookups run in parallel with embedText(),
 * saving ~300-400ms on every request that contains a verse reference.
 */
async function askRag(question, history = []) {

  // ── Step 1: Parse explicit references synchronously (~0ms, no I/O) ────────
  const gitaMatch = question.match(/chapter\s+(\d+)(?:\s*,?\s*|\s+and\s+)verse\s+(\d+)/i);
  const gitaCh   = gitaMatch ? parseInt(gitaMatch[1], 10) : null;
  const gitaV    = gitaMatch ? parseInt(gitaMatch[2], 10) : null;

  const KANDA_NAME_MAP = {
    bala: 1, ayodhya: 2, aranya: 3, kishkindha: 4, sundara: 5, yuddha: 6, uttara: 7,
    'bala kanda': 1, 'ayodhya kanda': 2, 'aranya kanda': 3,
    'kishkindha kanda': 4, 'sundara kanda': 5, 'yuddha kanda': 6, 'uttara kanda': 7,
  };
  const ramNumeric = question.match(/kanda\s+(\d+)(?:\s*,?\s*|\s+and\s+)sarga\s+(\d+)(?:\s*,?\s*|\s+and\s+)(?:shloka|verse)\s+(\d+)/i);
  const ramNamed   = question.match(/([a-z]+(?:\s+kanda)?)\s*,?\s*sarga\s+(\d+)\s*,?\s*(?:shloka|verse)\s+(\d+)/i);

  let ramK = null, ramS = null, ramShl = null;
  if (ramNumeric) {
    ramK = parseInt(ramNumeric[1], 10); ramS = parseInt(ramNumeric[2], 10); ramShl = parseInt(ramNumeric[3], 10);
  } else if (ramNamed) {
    const rawName = ramNamed[1].toLowerCase().trim();
    const mapped  = KANDA_NAME_MAP[rawName] || KANDA_NAME_MAP[rawName.replace(/\s+kanda$/, '')] || null;
    if (mapped) { ramK = mapped; ramS = parseInt(ramNamed[2], 10); ramShl = parseInt(ramNamed[3], 10); }
  }

  // ── Step 2: Parallel — embed question + fetch exact-match docs ────────────
  // embedText and the two getDoc calls have no dependencies on each other;
  // running them together saves one or two sequential Firestore round-trips.
  const [queryVector, exactGitaDoc, exactRamDoc] = await Promise.all([
    embedText(question, 'RETRIEVAL_QUERY').catch(e => {
      console.error('[RAG] Embedding failed:', e.message);
      return [];
    }),
    (gitaCh && gitaV)
      ? getDoc('verses', `bhagavad-gita_${gitaCh}_${gitaV}`).catch(() => null)
      : Promise.resolve(null),
    (ramK && ramS && ramShl)
      ? getDoc('verses', `valmiki-ramayana_${ramK}_${ramS}_${ramShl}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  // ── Step 3: KNN similarity search (sequential — needs the vector) ─────────
  let retrieved = [];
  if (queryVector && queryVector.length > 0) {
    try {
      retrieved = await findNearestVerses(queryVector, TOP_K);
    } catch (dbErr) {
      console.error('[RAG] Vector retrieval failed:', dbErr.message);
    }
  }

  // ── Step 4: Inject exact-match docs at position 0 (similarity = 1.0) ─────
  function injectDoc(doc, extra) {
    if (!doc) return;
    const idx = retrieved.findIndex(v => v.id === doc.id);
    if (idx > -1) retrieved.splice(idx, 1);
    retrieved.unshift({ id: doc.id, similarity: 1.0, ...extra(doc) });
  }

  injectDoc(exactGitaDoc, d => ({
    chapterNumber: d.chapterNumber,
    verseNumber: d.verseNumber,
    sanskrit: d.sanskrit,
    transliteration: d.transliteration,
    translationEnglish: d.translationEnglish,
    translationHindi: d.translationHindi,
    wordMeanings: d.wordMeanings,
    detailedExplanations: d.detailedExplanations,
    tags: d.tags,
  }));

  injectDoc(exactRamDoc, d => ({
    book: d.book,
    kanda: d.kanda,
    kandaNumber: d.kandaNumber,
    sarga: d.sarga,
    shlokaNumber: d.shlokaNumber,
    sanskrit: d.sanskrit,
    transliteration: d.transliteration,
    translationEnglish: d.translationEnglish,
    explanationEnglish: d.explanationEnglish,
    comments: d.comments,
    verified: d.verified,
    tags: d.tags || [],
  }));

  // ── Step 5: Context construction — always provide best available verses ───
  //
  // Design principle: Sarathi ALWAYS answers. We never send a hard refusal
  // instruction to the LLM. Instead:
  //   • Verses above SIMILARITY_THRESHOLD → "direct match" context
  //   • Verses below threshold            → "background context" (softer note)
  //   • Zero retrieved                    → LLM uses its own scriptural knowledge
  //
  // Only TOP_CONTEXT (3) verses are sent to keep the prompt compact and fast.
  // Guru commentaries are truncated at MAX_COMMENTARY_CHARS (600) — the LLM
  // naturally expands from its training on these Gurus; the truncated snippet
  // is enough to ground and verify the response.

  const topSimilarity      = retrieved.length > 0 ? (retrieved[0].similarity || 0) : 0;
  const aboveThreshold     = retrieved.filter(v => (v.similarity || 0) >= SIMILARITY_THRESHOLD);
  const isDirectlyInContext = aboveThreshold.length > 0;

  // Use high-confidence matches first; fall back to best-available for grounding
  const contextVerses = (aboveThreshold.length > 0 ? aboveThreshold : retrieved)
    .slice(0, TOP_CONTEXT);

  let contextLines;
  if (contextVerses.length === 0) {
    // No embedding results at all — ask LLM to draw on its own training
    contextLines = '[No verse retrieved. Answer from your deep knowledge of the Bhagavad Gita and Valmiki Ramayana. Be transparent: note when sharing general scriptural wisdom rather than a pinpointed verse.]';
  } else {
    const prefix = isDirectlyInContext
      ? '' // High-confidence — no extra instruction needed
      : '[Note: The verses below are the closest available matches but may not directly address the question. Use them as reference and draw on your broader Gita/Ramayana knowledge to give a complete, accurate answer.]\n\n';

    contextLines = prefix + contextVerses.map((v, i) => {
      const wordMeanings = Array.isArray(v.wordMeanings)
        ? v.wordMeanings.map(w => `${w.word} = ${w.meaning}`).join(', ')
        : '';

      // Truncate long commentaries — avg 3000 chars; 600 keeps the key insight
      // and keeps the prompt well within the LLM's context window.
      const explanations = Array.isArray(v.detailedExplanations) && v.detailedExplanations.length > 0
        ? v.detailedExplanations.map(exp => {
            const text = exp.explanation.length > MAX_COMMENTARY_CHARS
              ? exp.explanation.slice(0, MAX_COMMENTARY_CHARS) + '…'
              : exp.explanation;
            return `[Commentary by ${exp.author} (${exp.language || 'English'})]: ${text}`;
          }).join('\n\n')
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
        wordMeanings   ? `Word Meanings: ${wordMeanings}` : '',
        explanations   ? `Guru Commentaries:\n${explanations}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n====================\n\n');
  }

  // ── Step 6: Build prompt and call LLM ────────────────────────────────────
  const isCompareMode  = question.toLowerCase().trim().startsWith('[compare]');
  const cleanQuestion  = isCompareMode ? question.replace(/^\[compare\]/i, '').trim() : question;

  // Build chat messages:
  //   1. System prompt (Sarathi identity + rules)
  //   2. Recent conversation history (up to last 3 exchanges) for context
  //   3. Final user message = grounded scripture context + current question
  //
  // The history is injected as real chat turns so the LLM natively understands
  // follow-ups like "explain that in English" or "give more detail on the second point".
  // 'sarathi' role maps to 'assistant' in the OpenAI chat format.
  const chatMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    // Inject conversation history (last N exchanges)
    ...history.map(m => ({
      role: m.role === 'sarathi' ? 'assistant' : 'user',
      content: m.content,
    })),
    // Final user turn = scripture context + current question
    { role: 'user', content: `${contextLines}\n\nUser Question: ${cleanQuestion}` },
  ];

  let answer = '';
  try {
    answer = await callLlmWithFallback(chatMessages, isCompareMode);
  } catch (llmError) {
    console.error('[RAG] LLM Execution Error:', llmError.message);
    answer = `⚠️ **Sarathi Notification:**\n\nThe AI service could not respond right now (${llmError.message}).\n\nPlease try again in a moment.`;
  }

  // ── Step 7: Build citations from above-threshold verses ──────────────────
  const citations = aboveThreshold.slice(0, TOP_CONTEXT).map(v => ({
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

  return { answered: true, inContext: isDirectlyInContext, answer, citations, topSimilarity };
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
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
const TOP_CONTEXT          = 2;    // max verses sent to LLM — 2 is enough for grounding
const MAX_COMMENTARY_CHARS = 200;  // truncate per-guru commentary — keeps token budget tight

// Primary + fallback model chain (ordered by quality → reliability)
const OPENROUTER_MODELS = [
  'google/gemma-2-9b-it:free',                // Fast, reliable, no thoughts
  'meta-llama/llama-3.3-70b-instruct:free',   // Best free model, but often times out
  'mistralai/mistral-nemo:free',              // Lightweight fallback
  'openrouter/free'                            // Last-resort wildcard
];

const GEMINI_MODELS = [
  'gemini-3.6-flash',         // Latest frontier model (Aug 2026) — best quality
  'gemini-3.5-flash',         // High-performance, widely used fallback
  'gemini-2.5-flash',         // Stable proven fallback — still supported
];

// Groq free-tier models — used automatically when all Gemini models fail
// Get a free key at: https://console.groq.com/keys
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',  // Best quality on Groq — matches Gemini Flash quality
  'llama3-70b-8192',          // Reliable fallback
  'gemma2-9b-it',             // Lightweight last resort
];

// ── Primary Client (Gemini / OpenRouter) ─────────────────────────────────────
let openaiClient;
function getOpenRouterClient() {
  if (!openaiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const isOpenRouter = apiKey.startsWith('sk-or-');

    openaiClient = new OpenAI({
      baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: apiKey,
      timeout: 10000, // 10-second hard timeout
      maxRetries: 0,  // Disable automatic SDK retries to fail fast
      defaultHeaders: isOpenRouter ? {
        'HTTP-Referer': 'https://gyansutraapp.pages.dev/',
        'X-Title': 'Gyan Sutra',
      } : undefined,
    });
  }
  return openaiClient;
}

// ── Secondary Client (Groq) ───────────────────────────────────────────────────
// Groq is used automatically when ALL Gemini models fail (quota / key expiry).
// Groq free tier: https://console.groq.com/keys
let groqClient;
function getGroqClient() {
  if (!groqClient) {
    const groqKey = process.env.GROQ_API_KEY || '';
    if (!groqKey) return null; // Groq not configured — skip silently
    groqClient = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      timeout: 10000,
      maxRetries: 0,
    });
  }
  return groqClient;
}

const SYSTEM_PROMPT = `You are Sarathi (सारथि) — Gyan Sutra's spiritual guide. You are a master of the Bhagavad Gita and Valmiki Ramayana, revered for giving concise, well-structured, and deeply authentic answers.

STRICT RULES — FOLLOW WITHOUT EXCEPTION:

1. **FORMAT — ALWAYS USE STRUCTURED SUBHEADINGS**:
   Every response MUST use EXACTLY these subheadings in markdown. Replace the bracketed text with your actual response. DO NOT copy the bracketed instructions into your output!

   ### 📖 The Teaching
   [Write your core answer here in 2-3 sentences. Start directly, no preamble.]

   ### 🕉️ Key Verse(s)
   [Cite 1-2 specific verses. Bold the reference. Give meaning in 1 sentence. If no specific verse exists, summarize the general scripture teaching here.]

   ### 🌿 Practical Takeaway
   [Write 2-3 sentences on how to apply this in daily life.]

   ### 🪔 Guru Perspectives
   [List maximum 2 gurus, 1 sentence each. Skip this entire section if the question is a simple factual question.]

   Never dump a flat wall of text. Always use the subheadings above. Never use markdown tables.

2. **COMPLETENESS & CLARITY**:
   - Every answer MUST be a complete thought. Never leave a sentence unfinished.
   - Total response: 150–400 words. Be thorough but concise.
   - Skip all preamble ("Great question", "Let me explain", etc.).

3. **ABSOLUTE AUTHENTICITY & ZERO HALLUCINATION (CRITICAL)**:
   - NEVER fabricate verse numbers, names, or events.
   - STRICT SEPARATION: Never mix characters, weapons, or events from the Mahabharata into the Ramayana (or vice-versa) unless explicitly comparing them. For example, do not put Shakuni in the Ramayana, or Indrajit in the Mahabharata.
   - If unsure of an exact verse, explicitly say: "The scriptures broadly teach…" instead of making up a verse number.

4. **ALWAYS ANSWER** spiritual, dharmic, philosophical, or devotional questions.
   ONLY decline if completely outside scripture (e.g., sports, tech, politics). Then say: "This falls outside the Gita and Ramayana."

5. **LANGUAGE**: English if asked in English. Pure Devanagari Hindi if asked in Hindi or Hinglish.

6. **NO INTERNAL THOUGHTS (CRITICAL)**: NEVER output your internal thinking process, reasoning steps, analysis, or internal monologue (e.g. "Let's re-read carefully...", "Wait, I should skip..."). Output ONLY the final user-facing response starting directly with "### 📖 The Teaching".

7. **CONTEXT RELEVANCE (CRITICAL)**:
   - You will receive a 'Retrieved Scripture Context' block. Evaluate if it actually matches the user's question.
   - If the user asks a follow-up (e.g., using "he" or "it") and the retrieved context is completely unrelated, IGNORE THE CONTEXT entirely.
   - Rely on your own deep knowledge of the Gita and Ramayana to answer follow-up questions accurately. DO NOT force a connection to irrelevant verses.`;

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

  // 2. Strip internal monologues or preamble sections.
  // We split by "📖 The Teaching" (making the ### optional) to ensure we only keep the actual answer block.
  const parts = text.split(/(?:###\s*)?📖 The Teaching/i);
  
  if (parts.length > 1) {
    // If the model leaked thoughts but eventually output the real answer, grab the real answer.
    text = "### 📖 The Teaching" + parts[parts.length - 1];
    
    // Sometimes the model talks to itself INSIDE the teaching block (e.g. echoing the bracketed instructions)
    // We strip out the bracketed template instructions if the model accidentally copied them.
    text = text.replace(/\[Write your core answer here.*?\]/g, '');
    text = text.replace(/\[Cite 1-2 specific verses.*?\]/g, '');
    text = text.replace(/\[Write 2-3 sentences.*?\]/g, '');
    text = text.replace(/\[List maximum 2 gurus.*?\]/g, '');
  } else {
    // Fallback stripping if the exact heading isn't used
    const thinkingPreamblePattern = /^(here(?:'s| is) (?:a |my |the )?thinking(?: process)?[:\-–—]?|let me think|analysis:|chain[- ]of[- ]thought:)/im;
    if (thinkingPreamblePattern.test(text)) {
      const realContentMatch = text.match(/(\n#{1,3} |\n\*{2}📖|\n📖|^\s*#{1,3} |\n---\n)/im);
      if (realContentMatch && realContentMatch.index > 0) {
        text = text.slice(realContentMatch.index).trim();
      }
    }
  }

  // 3. Strip known OpenRouter / safety guard prefixes
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
        max_tokens: 800, // compare mode — each model gives a focused perspective
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

  // ── Phase 1: Try primary provider (Gemini or OpenRouter) ──────────────────
  let lastError = null;
  const apiKey = process.env.GEMINI_API_KEY || '';
  const modelsToTry = apiKey.startsWith('sk-or-') ? OPENROUTER_MODELS : GEMINI_MODELS;

  for (const model of modelsToTry) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 700, // Sarathi answers are 150-400 words (~500 tokens max)
      });

      let rawAnswer = response.choices[0]?.message?.content?.trim();
      if (rawAnswer) {
        const cleaned = cleanResponse(rawAnswer);
        return cleaned.length > 10 ? cleaned : rawAnswer;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[RAG] Gemini model ${model} failed (${err.message}). Trying next...`);
    }
  }

  // ── Phase 2: Gemini exhausted — fall back to Groq ─────────────────────────
  const groq = getGroqClient();
  if (groq) {
    console.warn('[RAG] All Gemini models failed. Switching to Groq fallback...');
    for (const model of GROQ_MODELS) {
      try {
        const response = await groq.chat.completions.create({
          model,
          messages: chatMessages,
          temperature: 0.2,
          max_tokens: 700,
        });

        let rawAnswer = response.choices[0]?.message?.content?.trim();
        if (rawAnswer) {
          console.info(`[RAG] Groq model ${model} responded successfully.`);
          const cleaned = cleanResponse(rawAnswer);
          return cleaned.length > 10 ? cleaned : rawAnswer;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[RAG] Groq model ${model} failed (${err.message}). Trying next...`);
      }
    }
  } else {
    console.warn('[RAG] Groq not configured (GROQ_API_KEY missing). Add it to .env for automatic failover.');
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
  //   1. System prompt (Sarathi identity + rules + current context)
  //   2. Recent conversation history (up to last 3 exchanges) for context
  //   3. Final user message = current question
  //
  // The history is injected as real chat turns so the LLM natively understands
  // follow-ups like "explain that in English" or "give more detail on the second point".
  // 'sarathi' role maps to 'assistant' in the OpenAI chat format.
  const chatMessages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nRetrieved Scripture Context:\n${contextLines}` },
    // Inject conversation history (last N exchanges)
    ...history.map(m => ({
      role: m.role === 'sarathi' ? 'assistant' : 'user',
      content: m.content,
    })),
    // Final user turn = current question
    { role: 'user', content: cleanQuestion },
  ];

  let answer = '';
  try {
    answer = await callLlmWithFallback(chatMessages, isCompareMode);
  } catch (llmError) {
    console.error('[RAG] LLM Execution Error:', llmError.message);
    answer = `⚠️ **Sarathi Notification:**\n\nThe AI service could not respond right now (${llmError.message}).\n\nPlease try again in a moment.`;
  }

  // Guard: if LLM returned empty content log it clearly
  if (!answer || answer.trim().length < 5) {
    console.error('[RAG] LLM returned empty or near-empty answer. Model may have refused or timed out.');
    answer = '⚠️ Sarathi received an empty response from the AI. Please try asking again — the service may be temporarily overloaded.';
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
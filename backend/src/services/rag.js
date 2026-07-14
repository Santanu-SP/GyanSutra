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

const SYSTEM_PROMPT = `You are Gyan Sutra's Saarthi, the ultimate scripture guide for the Bhagavad Gita and the Valmiki Ramayana. Your knowledge is profound, highly structured, and deeply authentic.

RULES — follow these without exception:
1. First, look at the retrieved context below. If it contains relevant verses, use them and cite their book, chapter/kanda, and verse/shloka (e.g., "Bhagavad Gita, Chapter 2, Verse 47").
2. Whenever you cite or refer to a shloka/verse, you MUST provide a detailed English translation of that shloka first, followed by the commentary.
3. The English used in both the translations and the commentary must be extremely simple, clear, and easy to read. Avoid complex, archaic, or overly academic vocabulary so that anyone can easily understand, while keeping the spiritual commentary completely authentic and faithful to the original scriptures.
4. If the retrieved context does not contain a clear answer, or if the user asks a broad question (like character analysis, summaries, or moral dilemmas), you MUST use your profound internal knowledge of the standard Valmiki Ramayana and Bhagavad Gita to provide a deeply accurate and comprehensive answer.
5. Do not speculate, modernize, or offer personal interpretations. Stick strictly to standard Vedantic and Itihasa philosophy.
6. Respond in English if the question is in English. If the question is in Hindi (whether written in Devanagari script or Hinglish/Roman script), you MUST respond entirely in pure Hindi (Devanagari script). Keep the answer concise but comprehensive.
7. EXCEPTION (Reflections): If the user specifically asks for "practical life lessons" or "reflection questions", generate profound, practical life lessons and reflective questions based purely on the spiritual principles found in the texts.
8. FORMATTING & TONE: Your output must be highly organized, visually elegant, and deeply educated. Use short, readable paragraphs. Use **bold text** for key spiritual concepts, and bullet points if listing multiple ideas. Maintain a warm, compassionate, and profoundly wise tone.

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

  // Step 2.5.1: Explicit Kanda/Sarga Match override (Ramayana)
  const explicitRamayana = question.match(/kanda\s+(\d+)(?:\s*,?\s*|\s+and\s+)sarga\s+(\d+)(?:\s*,?\s*|\s+and\s+)(?:shloka|verse)\s+(\d+)/i);
  if (explicitRamayana) {
    const kNum = parseInt(explicitRamayana[1], 10);
    const sarga = parseInt(explicitRamayana[2], 10);
    const shloka = parseInt(explicitRamayana[3], 10);
    const exactDoc = await getDoc('verses', `valmiki-ramayana_${kNum}_${sarga}_${shloka}`);
    
    if (exactDoc) {
      const existingIdx = retrieved.findIndex(v => v.id === exactDoc.id);
      if (existingIdx > -1) {
        retrieved.splice(existingIdx, 1);
      }
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

  // Step 2.6: Explicit Chapter/Kanda Summary Match override
  const chapterSummaryMatch = question.match(/(?:explain|summarize|summary of|about|what is(?: meant by)?)\s+(?:the\s+)?(?:(?:chapter|kanda|kand)\s+([a-zA-Z0-9]+)|([a-zA-Z0-9]+)\s+(?:kanda|kand))|(?:(?:chapter|kanda|kand)\s+([a-zA-Z0-9]+)|([a-zA-Z0-9]+)\s+(?:kanda|kand))\s+(?:summary|explanation)/i);
  if (chapterSummaryMatch && !explicitMatch && !explicitRamayana) {
    const ch = chapterSummaryMatch[1] || chapterSummaryMatch[2] || chapterSummaryMatch[3] || chapterSummaryMatch[4];
    retrieved.unshift({
      id: `summary_${ch}`,
      similarity: 1.0,
      chapterNumber: ch,
      verseNumber: 'All',
      sanskrit: '',
      translationEnglish: `User explicitly requested a summary or explanation for Chapter/Kanda ${ch}. Provide it based on standard knowledge.`,
      translationHindi: '',
      wordMeanings: [],
      detailedExplanations: [],
      tags: []
    });
  }

  // Step 2.7: Explicit Daily Darshan Match override
  const dailyDarshanMatch = question.match(/daily\s+(?:darshan|verse)/i);
  if (dailyDarshanMatch && !explicitMatch && !chapterSummaryMatch) {
    const gitaData = require('../../data/gita.json');
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const verseIndex = daysSinceEpoch % gitaData.length;
    const v = gitaData[verseIndex];
    
    const exactDoc = await getDoc('verses', `bhagavad-gita_${v.chapter_number}_${v.verse_number}`);
    if (exactDoc) {
      const existingIdx = retrieved.findIndex(doc => doc.id === exactDoc.id);
      if (existingIdx > -1) {
        retrieved.splice(existingIdx, 1);
      }
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

  // Instead of refusing, we will pass an empty context or the best available context 
  // and let the LLM answer from its profound internal knowledge base.
  let contextLines = "";
  if (passedThreshold.length === 0) {
    contextLines = "No specific verses retrieved. Please answer directly using your comprehensive internal knowledge of the texts.";
  } else {
    contextLines = passedThreshold.map((v, i) => {
    const wordMeanings = Array.isArray(v.wordMeanings)
      ? v.wordMeanings.map(w => `${w.word} = ${w.meaning}`).join(', ')
      : '';
      
    const explanations = Array.isArray(v.detailedExplanations) && v.detailedExplanations.length > 0
      ? v.detailedExplanations.map(exp => `[Commentary by ${exp.author}]: ${exp.explanation}`).join('\n')
      : '';

    const titleLine = v.book === 'Ramayana' || v.kanda 
      ? `[${i + 1}] Ramayana, ${v.kanda || 'Kanda ' + v.kandaNumber}, Sarga ${v.sarga}, Shloka ${v.shlokaNumber} (similarity: ${v.similarity.toFixed(3)})`
      : `[${i + 1}] Chapter ${v.chapterNumber}, Verse ${v.verseNumber} (similarity: ${v.similarity.toFixed(3)})`;

    return [
      titleLine,
      `Sanskrit: ${v.sanskrit || ''}`,
      `Transliteration: ${v.transliteration || ''}`,
      `English Translation: ${v.translationEnglish || v.explanationEnglish || ''}`,
      `Hindi: ${v.translationHindi || ''}`,
      wordMeanings ? `Word meanings: ${wordMeanings}` : '',
      explanations ? `Detailed Explanations:\n${explanations}` : '',
      v.comments ? `Commentary:\n${v.comments}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }).join('\n\n---\n\n');
  }

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
    let rawAnswer = response.choices[0].message.content.trim();
    // OpenRouter's free wildcard occasionally routes through Llama Guard, 
    // which injects a safety tag. We strip it out cleanly here.
    answer = rawAnswer.replace(/^User Safety:\s*safe\n*/i, '').replace(/^Your Reflection\n*/i, '').trim();
  }

  // Step 6: Map Citations back safely
  const citations = passedThreshold.map(v => ({
    id: v.id,
    chapterNumber: v.chapterNumber,
    verseNumber: v.verseNumber,
    sanskrit: v.sanskrit,
    transliteration: v.transliteration,
    translationEnglish: v.translationEnglish || v.explanationEnglish || '',
    translationHindi: v.translationHindi,
    detailedExplanations: v.detailedExplanations || (v.comments ? [{ author: "Valmiki Ramayana Commentary", explanation: v.comments }] : []),
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
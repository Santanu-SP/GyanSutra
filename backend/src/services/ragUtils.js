'use strict';

const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'does', 'for', 'from', 'how', 'in', 'is',
  'it', 'me', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'which',
  'who', 'why', 'with', 'teach', 'teaches', 'explain', 'please',
  'और', 'का', 'की', 'के', 'क्या', 'को', 'से', 'है', 'हैं', 'में', 'पर', 'यह', 'वह',
]);

const KANDA_NAME_MAP = {
  bala: 1,
  ayodhya: 2,
  aranya: 3,
  kishkindha: 4,
  sundara: 5,
  yuddha: 6,
  uttara: 7,
};

function toAsciiDigits(value) {
  return String(value).replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));
}

function normalizeQuestion(value) {
  return toAsciiDigits(String(value || '').normalize('NFKC'))
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseExplicitReference(value) {
  const question = normalizeQuestion(value);

  const gitaPatterns = [
    /(?:bhagavad\s*gita|gita|bg|भगवद्?\s*गीता|गीता)\s*(?:chapter|अध्याय)?\s*(\d{1,2})\s*[.:/\-]\s*(\d{1,3})/i,
    /(?:chapter|अध्याय)\s*(\d{1,2})(?:\s*,?\s*|\s+and\s+)(?:verse|shloka|श्लोक)\s*(\d{1,3})/i,
  ];
  for (const pattern of gitaPatterns) {
    const match = question.match(pattern);
    if (!match) continue;
    const chapterNumber = Number(match[1]);
    const verseNumber = Number(match[2]);
    if (chapterNumber >= 1 && chapterNumber <= 18 && verseNumber >= 1) {
      return {
        type: 'gita',
        id: `bhagavad-gita_${chapterNumber}_${verseNumber}`,
        chapterNumber,
        verseNumber,
      };
    }
  }

  const compactRamayana = question.match(
    /(?:valmiki\s+)?(?:ramayana|रामायण)\s*(\d)\s*[.:/\-]\s*(\d{1,3})\s*[.:/\-]\s*(\d{1,3})/i,
  );
  if (compactRamayana) {
    const kandaNumber = Number(compactRamayana[1]);
    const sarga = Number(compactRamayana[2]);
    const shlokaNumber = Number(compactRamayana[3]);
    if (kandaNumber >= 1 && kandaNumber <= 7 && sarga >= 1 && shlokaNumber >= 1) {
      return {
        type: 'ramayana',
        id: `valmiki-ramayana_${kandaNumber}_${sarga}_${shlokaNumber}`,
        kandaNumber,
        sarga,
        shlokaNumber,
      };
    }
  }

  const numericRamayana = question.match(
    /(?:kanda|काण्ड|कांड)\s*(\d)(?:\s*,?\s*|\s+and\s+)(?:sarga|सर्ग)\s*(\d{1,3})(?:\s*,?\s*|\s+and\s+)(?:shloka|verse|श्लोक)\s*(\d{1,3})/i,
  );
  if (numericRamayana) {
    const kandaNumber = Number(numericRamayana[1]);
    const sarga = Number(numericRamayana[2]);
    const shlokaNumber = Number(numericRamayana[3]);
    if (kandaNumber >= 1 && kandaNumber <= 7 && sarga >= 1 && shlokaNumber >= 1) {
      return {
        type: 'ramayana',
        id: `valmiki-ramayana_${kandaNumber}_${sarga}_${shlokaNumber}`,
        kandaNumber,
        sarga,
        shlokaNumber,
      };
    }
  }

  const namedRamayana = question.match(
    /(bala|ayodhya|aranya|kishkindha|sundara|yuddha|uttara)(?:\s+kanda)?\s*,?\s*sarga\s*(\d{1,3})\s*,?\s*(?:shloka|verse)\s*(\d{1,3})/i,
  );
  if (namedRamayana) {
    const kandaNumber = KANDA_NAME_MAP[namedRamayana[1].toLowerCase()];
    const sarga = Number(namedRamayana[2]);
    const shlokaNumber = Number(namedRamayana[3]);
    if (sarga >= 1 && shlokaNumber >= 1) {
      return {
        type: 'ramayana',
        id: `valmiki-ramayana_${kandaNumber}_${sarga}_${shlokaNumber}`,
        kandaNumber,
        sarga,
        shlokaNumber,
      };
    }
  }

  return null;
}

function parseExplicitReferences(value) {
  const primary = parseExplicitReference(value);
  const references = primary ? [primary] : [];
  const seen = new Set(references.map((reference) => reference.id));
  const question = normalizeQuestion(value);

  if (/(bhagavad\s*gita|\bgita\b|\bbg\b|भगवद्?\s*गीता|गीता)/i.test(question)) {
    for (const match of question.matchAll(/(\d{1,2})\s*[.:/\-]\s*(\d{1,3})/g)) {
      const chapterNumber = Number(match[1]);
      const verseNumber = Number(match[2]);
      const id = `bhagavad-gita_${chapterNumber}_${verseNumber}`;
      if (
        chapterNumber >= 1
        && chapterNumber <= 18
        && verseNumber >= 1
        && !seen.has(id)
      ) {
        references.push({ type: 'gita', id, chapterNumber, verseNumber });
        seen.add(id);
      }
    }
  }

  if (/(ramayana|रामायण)/i.test(question)) {
    for (const match of question.matchAll(/(\d)\s*[.:/\-]\s*(\d{1,3})\s*[.:/\-]\s*(\d{1,3})/g)) {
      const kandaNumber = Number(match[1]);
      const sarga = Number(match[2]);
      const shlokaNumber = Number(match[3]);
      const id = `valmiki-ramayana_${kandaNumber}_${sarga}_${shlokaNumber}`;
      if (
        kandaNumber >= 1
        && kandaNumber <= 7
        && sarga >= 1
        && shlokaNumber >= 1
        && !seen.has(id)
      ) {
        references.push({ type: 'ramayana', id, kandaNumber, sarga, shlokaNumber });
        seen.add(id);
      }
    }
  }

  return references.slice(0, 4);
}

function isFollowUpQuestion(value) {
  const question = normalizeQuestion(value);
  const wordCount = question.split(' ').filter(Boolean).length;
  if (wordCount > 18) return false;
  return /\b(it|that|this|those|them|first|second|former|latter|above|more|why|how|what about)\b/i.test(question)
    || /(यह|इस|उस|वह|इन|उन|पहले|दूसरे|और समझा|क्यों|कैसे)/u.test(question);
}

function buildRetrievalQuery(question, history = []) {
  if (!isFollowUpQuestion(question)) return question;
  const previousUserMessage = [...history]
    .reverse()
    .find((message) => message?.role === 'user' && typeof message.content === 'string');
  if (!previousUserMessage) return question;
  return `${previousUserMessage.content.slice(0, 350)}\nFollow-up: ${question}`;
}

function tokenize(value) {
  const tokens = normalizeQuestion(value).match(/[\p{L}\p{N}]+/gu) || [];
  return [...new Set(tokens.filter((token) => token.length > 1 && !STOP_WORDS.has(token)))];
}

function candidateText(verse) {
  const commentaries = Array.isArray(verse?.detailedExplanations)
    ? verse.detailedExplanations.slice(0, 3).map((item) => item?.explanation || '').join(' ')
    : '';
  return [
    verse?.translationEnglish,
    verse?.translationHindi,
    verse?.transliteration,
    verse?.explanationEnglish,
    verse?.comments,
    Array.isArray(verse?.tags) ? verse.tags.join(' ') : '',
    commentaries,
  ].filter(Boolean).join(' ');
}

function lexicalScore(queryTokens, verse) {
  if (queryTokens.length === 0) return 0;
  const textTokens = new Set(tokenize(candidateText(verse)));
  let matches = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) matches += 1;
  }
  return matches / queryTokens.length;
}

function rerankCandidates(candidates, question) {
  const queryTokens = tokenize(question);
  const seen = new Set();
  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => {
      if (!candidate?.id || seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .map((candidate) => {
      const semantic = Number.isFinite(candidate.similarity) ? candidate.similarity : 0;
      const lexical = lexicalScore(queryTokens, candidate);
      const exactBoost = semantic >= 0.999 ? 1 : 0;
      return {
        ...candidate,
        rerankScore: exactBoost || ((semantic * 0.88) + (lexical * 0.12)),
      };
    })
    .sort((left, right) => right.rerankScore - left.rerankScore);
}

function truncateAtBoundary(value, maxChars) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  const shortened = text.slice(0, Math.max(1, maxChars - 1));
  const boundary = Math.max(shortened.lastIndexOf('. '), shortened.lastIndexOf('। '), shortened.lastIndexOf(' '));
  return `${shortened.slice(0, boundary > maxChars * 0.55 ? boundary : shortened.length).trim()}…`;
}

function verseReference(verse) {
  if (verse?.book === 'ramayana' || verse?.kanda || verse?.kandaNumber) {
    return `Valmiki Ramayana, ${verse.kanda || `Kanda ${verse.kandaNumber}`}, Sarga ${verse.sarga}, Shloka ${verse.shlokaNumber}`;
  }
  return `Bhagavad Gita, Chapter ${verse?.chapterNumber}, Verse ${verse?.verseNumber}`;
}

function toRetrievedVerse(doc, similarity = 1) {
  if (!doc) return null;
  return {
    id: doc.id,
    similarity,
    chapterNumber: doc.chapterNumber,
    verseNumber: doc.verseNumber,
    book: doc.book,
    kanda: doc.kanda,
    kandaNumber: doc.kandaNumber,
    sarga: doc.sarga,
    shlokaNumber: doc.shlokaNumber,
    sanskrit: doc.sanskrit || '',
    transliteration: doc.transliteration || '',
    translationEnglish: doc.translationEnglish || '',
    translationHindi: doc.translationHindi || '',
    explanationEnglish: doc.explanationEnglish || '',
    comments: doc.comments || '',
    wordMeanings: doc.wordMeanings || [],
    detailedExplanations: doc.detailedExplanations || [],
    tags: doc.tags || [],
  };
}

function unsupportedAnswerReferences(answer, allowedIds, sourceCount) {
  const unsupported = [];
  const text = toAsciiDigits(answer || '');
  let validSourceMarkers = 0;

  for (const match of text.matchAll(/\[S(\d+)\]/gi)) {
    const index = Number(match[1]);
    if (index < 1 || index > sourceCount) unsupported.push(match[0]);
    else validSourceMarkers += 1;
  }
  if (sourceCount > 0 && validSourceMarkers === 0) unsupported.push('missing source marker');

  const allowed = new Set(allowedIds);
  for (const match of text.matchAll(/(?:bhagavad\s*gita|gita)\s*(?:chapter\s*)?(\d{1,2})\s*[,.:\-]?\s*(?:verse\s*)?(\d{1,3})/gi)) {
    const id = `bhagavad-gita_${Number(match[1])}_${Number(match[2])}`;
    if (!allowed.has(id)) unsupported.push(match[0]);
  }
  for (const match of text.matchAll(/chapter\s*(\d{1,2})\s*[,.:\-]?\s*verse\s*(\d{1,3})/gi)) {
    const id = `bhagavad-gita_${Number(match[1])}_${Number(match[2])}`;
    if (!allowed.has(id)) unsupported.push(match[0]);
  }

  for (const match of text.matchAll(/(?:valmiki\s+)?ramayana[^\n]{0,50}?(?:kanda\s*)?(\d)[,.:\-\s]+(?:sarga\s*)?(\d{1,3})[,.:\-\s]+(?:shloka|verse)\s*(\d{1,3})/gi)) {
    const id = `valmiki-ramayana_${Number(match[1])}_${Number(match[2])}_${Number(match[3])}`;
    if (!allowed.has(id)) unsupported.push(match[0]);
  }

  return [...new Set(unsupported)];
}

function isDirectTextRequest(question) {
  if (!parseExplicitReference(question)) return false;
  return /\b(show|quote|display|read|text|translation|original verse)\b/i.test(question)
    || /(दिखा|पढ़|मूल श्लोक|अनुवाद)/u.test(question);
}

module.exports = {
  buildRetrievalQuery,
  isDirectTextRequest,
  isFollowUpQuestion,
  normalizeQuestion,
  parseExplicitReference,
  parseExplicitReferences,
  rerankCandidates,
  toAsciiDigits,
  toRetrievedVerse,
  truncateAtBoundary,
  unsupportedAnswerReferences,
  verseReference,
};

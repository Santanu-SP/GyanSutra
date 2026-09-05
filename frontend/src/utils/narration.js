// Keep the spoken script deterministic: no generated paraphrases of scripture.
export const LANGUAGE_LOCALES = {
  english: 'en-IN', hindi: 'hi-IN', bengali: 'bn-IN', marathi: 'mr-IN', telugu: 'te-IN', tamil: 'ta-IN',
};

export function cleanSpeechText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|>\s*)/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

export function speechChunks(value, maximum = 360) {
  const chunks = [];
  for (const sentence of cleanSpeechText(value).split(/(?<=[.!?।॥])\s+|\n+/u)) {
    let remaining = sentence.trim();
    while (remaining.length > maximum) {
      const window = remaining.slice(0, maximum + 1);
      const punctuation = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(': '));
      const space = window.lastIndexOf(' ');
      const end = punctuation > maximum / 2 ? punctuation + 1 : space > 0 ? space : maximum;
      chunks.push(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trim();
    }
    if (remaining) chunks.push(remaining);
  }
  return chunks;
}

export function buildNarration({ sanskrit, translation, explanation, context, contentLanguage, full, labels }) {
  const result = [];
  const add = (text, kind, locale, heading) => {
    const chunks = speechChunks(text);
    if (!chunks.length) return;
    if (heading) result.push({ text: `${heading}.`, kind, locale, pause: 300, heading: true });
    chunks.forEach((text, index) => result.push({
      text, kind, locale,
      pause: index === chunks.length - 1 ? 950 : kind === 'verse' ? 550 : 220,
    }));
  };
  // Dandas mark breath/verse boundaries. Verse references are visual metadata.
  const verse = cleanSpeechText(sanskrit)
    .replace(/[॥|।]+\s*[०-९\d]+(?:[.।:|-][०-९\d]+)*\s*[॥|।]*/gu, '॥')
    .replace(/[०-९\d]+(?:[.:][०-९\d]+)*\s*$/u, '')
    .replace(/॥|\|\|/g, '.\n').replace(/।|\|/g, ',\n');
  add(verse, 'verse', 'sa-IN');
  const locale = LANGUAGE_LOCALES[contentLanguage] || 'en-IN';
  add(translation, 'translation', locale, labels.meaningIntro || labels.translation);
  if (full) {
    if (cleanSpeechText(explanation) !== cleanSpeechText(translation)) {
      add(explanation, 'explanation', locale, labels.explanationIntro || labels.explanation);
    }
    if (![translation, explanation].some((text) => cleanSpeechText(text) === cleanSpeechText(context))) {
      add(context, 'context', locale, labels.contextIntro || labels.context);
    }
  }
  return result;
}

const baseLanguage = (locale) => locale?.toLowerCase().replace(/_/g, '-').split('-')[0];

export function rankedVoices(voices, locale, online = true) {
  const score = (voice) => {
    const name = `${voice.name} ${voice.voiceURI}`;
    return (/neural|natural|premium|enhanced/i.test(name) ? 100 : 0)
      + (voice.lang?.toLowerCase() === locale.toLowerCase() ? 30 : 0)
      + (/google|microsoft|siri/i.test(name) ? 15 : 0)
      + (voice.localService === false && online ? 10 : 0)
      + (voice.default ? 1 : 0);
  };
  return voices.map((voice, index) => ({
    // Browser SpeechSynthesisVoice properties are not enumerable.
    name: voice.name, lang: voice.lang, voiceURI: voice.voiceURI,
    localService: voice.localService, default: voice.default, index,
  })).filter((voice) => baseLanguage(voice.lang) === baseLanguage(locale)
    && (online || voice.localService !== false))
    .sort((a, b) => score(b) - score(a));
}

export function deviceVoice(voices, locale, selectedURI, online = true) {
  const matches = rankedVoices(voices, locale, online);
  return matches.find((voice) => voice.voiceURI === selectedURI) || matches[0]
    || (locale === 'sa-IN' ? rankedVoices(voices, 'hi-IN', online)[0] : undefined);
}

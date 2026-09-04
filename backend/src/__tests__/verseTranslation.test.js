const mockCallLlmWithFallback = jest.fn();

jest.mock('../services/rag', () => ({
  callLlmWithFallback: mockCallLlmWithFallback,
}));

const {
  translateVerseContent,
  __test: { parseModelTranslation, sourceDetails, translationCache },
} = require('../services/verseTranslation');

describe('verse translation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    translationCache.clear();
  });

  test('uses the attributed English source and a matching explanation', () => {
    const source = sourceDetails({
      book: 'gita',
      translationEnglish: 'Act without attachment.',
      translationHindi: 'आसक्ति के बिना कर्म करो।',
      translationSources: { english: { author: 'Source Translator' } },
      detailedExplanations: [
        { author: 'Source Commentator', language: 'english', explanation: 'This concerns disciplined action.' },
      ],
      wordMeanings: [{ word: 'कर्म', meaning: 'action' }],
    });

    expect(source.sourceLanguage).toBe('English');
    expect(source.sourceAuthor).toBe('Source Translator');
    expect(source.explanationSource).toBe('Source Commentator');
    expect(source.wordMeanings).toEqual([{ word: 'कर्म', meaning: 'action' }]);
  });

  test('rejects a response that is not written in the requested script', () => {
    expect(() => parseModelTranslation(
      '{"translation":"English only","explanation":"","context":"","wordMeanings":[]}',
      'te',
      { wordMeanings: [] },
    )).toThrow(/requested language script/);
  });

  test('returns a marked Bengali translation without changing Sanskrit words', async () => {
    mockCallLlmWithFallback.mockResolvedValue({
      answer: JSON.stringify({
        translation: 'আসক্তি ছাড়া কর্ম করো।',
        explanation: 'এটি শৃঙ্খলাপূর্ণ কর্মের কথা বলে।',
        context: '',
        wordMeanings: [{ word: 'ignored', meaning: 'কর্ম' }],
      }),
    });

    const result = await translateVerseContent({
      id: 'bhagavad-gita_2_47',
      book: 'gita',
      translationEnglish: 'Act without attachment.',
      wordMeanings: [{ word: 'कर्म', meaning: 'action' }],
    }, 'bn');

    expect(result.translation).toBe('আসক্তি ছাড়া কর্ম করো।');
    expect(result.wordMeanings).toEqual([{ word: 'कर्म', meaning: 'কর্ম' }]);
    expect(result.status).toBe('machine-assisted-unreviewed');
  });
});

const mockEmbedText = jest.fn();
const mockFindNearestVerses = jest.fn();
const mockGetDoc = jest.fn();
const mockQaAdd = jest.fn();
const mockCompletionCreate = jest.fn();

jest.mock('../services/embedding', () => ({
  embedText: mockEmbedText,
}));

jest.mock('../services/firestore', () => ({
  findNearestVerses: mockFindNearestVerses,
  getDoc: mockGetDoc,
  collections: {
    qaLog: () => ({ add: mockQaAdd }),
  },
}));

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: { completions: { create: mockCompletionCreate } },
  })),
}));

const verse = {
  id: 'bhagavad-gita_2_47',
  similarity: 0.91,
  chapterNumber: 2,
  verseNumber: 47,
  sanskrit: 'कर्मण्येवाधिकारस्ते',
  transliteration: 'karmaṇy evādhikāras te',
  translationEnglish: 'You have a right to action, but not to its fruits.',
  translationHindi: 'तुम्हारा अधिकार कर्म में है, फल में नहीं।',
  wordMeanings: [],
  detailedExplanations: [],
  tags: ['duty'],
};

function loadRag(overrides = {}) {
  jest.resetModules();
  for (const key of [
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY',
    'RAG_CACHE_ENABLED',
    'RAG_MAX_MODEL_ATTEMPTS',
    'RAG_PROVIDER_ORDER',
  ]) delete process.env[key];
  Object.assign(process.env, {
    RAG_CACHE_ENABLED: 'false',
    ...overrides,
  });
  return require('../services/rag');
}

describe('bounded grounded RAG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmbedText.mockResolvedValue(new Array(384).fill(0.01));
    mockFindNearestVerses.mockResolvedValue([verse]);
    mockGetDoc.mockResolvedValue(null);
    mockQaAdd.mockResolvedValue(undefined);
  });

  test('returns cited evidence instead of throwing when no provider is configured', async () => {
    const { askRag } = loadRag();
    const result = await askRag('What does the Gita teach about duty?');

    expect(result).toMatchObject({
      answered: true,
      inContext: true,
      degraded: true,
      reason: 'NO_AI_PROVIDER',
    });
    expect(result.citations.map((citation) => citation.id)).toEqual(['bhagavad-gita_2_47']);
    expect(result.answer).toContain('presenting only the retrieved evidence');
    expect(mockCompletionCreate).not.toHaveBeenCalled();
  });

  test('returns fallback copy in the selected language', async () => {
    const { askRag } = loadRag();
    const result = await askRag('Explain duty', [], [], 'bn');

    expect(result.answer).toContain('ব্যাখ্যা পরিষেবা');
    expect(result.answer).not.toContain('The explanation service');
  });

  test('does not spend model credits when retrieval has no strong evidence', async () => {
    mockFindNearestVerses.mockResolvedValue([{ ...verse, similarity: 0.3 }]);
    const { askRag } = loadRag({ GEMINI_API_KEY: 'test-key' });
    const result = await askRag('A completely unrelated question');

    expect(result).toMatchObject({
      answered: false,
      inContext: false,
      degraded: false,
      reason: 'no_strong_evidence',
    });
    expect(mockCompletionCreate).not.toHaveBeenCalled();
    expect(mockEmbedText).toHaveBeenCalledWith(
      'A completely unrelated question',
      { inputType: 'query' },
    );
  });

  test('serves a direct verse request without embedding, KNN, or model calls', async () => {
    mockGetDoc.mockResolvedValue(verse);
    const { askRag } = loadRag({ GEMINI_API_KEY: 'test-key' });
    const result = await askRag('Show Gita 2.47');

    expect(result).toMatchObject({
      answered: true,
      reason: 'direct_source_response',
      degraded: false,
    });
    expect(mockGetDoc).toHaveBeenCalledWith('verses', 'bhagavad-gita_2_47');
    expect(mockEmbedText).not.toHaveBeenCalled();
    expect(mockFindNearestVerses).not.toHaveBeenCalled();
    expect(mockCompletionCreate).not.toHaveBeenCalled();
  });

  test('does not substitute another verse when an explicit reference is absent', async () => {
    mockGetDoc.mockResolvedValue(null);
    const { askRag } = loadRag({ GEMINI_API_KEY: 'test-key' });
    const result = await askRag('Explain Gita 2.999');

    expect(result).toMatchObject({
      answered: false,
      inContext: false,
      reason: 'no_strong_evidence',
    });
    expect(mockGetDoc).toHaveBeenCalledWith('verses', 'bhagavad-gita_2_999');
    expect(mockEmbedText).not.toHaveBeenCalled();
    expect(mockFindNearestVerses).not.toHaveBeenCalled();
    expect(mockCompletionCreate).not.toHaveBeenCalled();
  });

  test('reuses cited context for a referential follow-up', async () => {
    mockGetDoc.mockResolvedValue(verse);
    const { askRag } = loadRag();
    const result = await askRag(
      'Explain that more',
      [{ role: 'user', content: 'What does duty mean?' }],
      ['bhagavad-gita_2_47'],
    );

    expect(result.citations[0].id).toBe('bhagavad-gita_2_47');
    expect(mockEmbedText).not.toHaveBeenCalled();
    expect(mockFindNearestVerses).not.toHaveBeenCalled();
  });

  test('accepts a generated answer that cites only retrieved evidence', async () => {
    mockCompletionCreate.mockResolvedValue({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: '### 📖 The Teaching\nAct without attachment.\n\n### 🕉️ Key Verse(s)\n**Bhagavad Gita, Chapter 2, Verse 47** [S1] supports this.\n\n### 🌿 Practical Takeaway\nFocus on sincere effort.',
        },
      }],
      usage: { prompt_tokens: 200, completion_tokens: 70, total_tokens: 270 },
    });
    const { askRag } = loadRag({ GEMINI_API_KEY: 'test-key' });
    const result = await askRag('What does the Gita teach about duty?');

    expect(result).toMatchObject({
      answered: true,
      degraded: false,
      reason: 'generated',
    });
    expect(result._diagnostics).toMatchObject({
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      usage: { totalTokens: 270 },
    });
    expect(mockCompletionCreate.mock.calls[0][0]).toMatchObject({
      max_tokens: 1200,
      reasoning_effort: 'minimal',
    });
  });

  test('rejects unsupported verse numbers returned by a model', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockCompletionCreate.mockResolvedValue({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: '### 📖 The Teaching\nSurrender.\n\n### 🕉️ Key Verse(s)\nBhagavad Gita Chapter 18 Verse 66 says so.\n\n### 🌿 Practical Takeaway\nPractice trust.',
        },
      }],
      usage: {},
    });
    const { askRag } = loadRag({ GEMINI_API_KEY: 'test-key' });
    const result = await askRag('What does the Gita teach about duty?');

    expect(result).toMatchObject({
      degraded: true,
      reason: 'grounding_validation_failed',
    });
    expect(result.answer).not.toContain('18 Verse 66');
    expect(result.answer).toContain('retrieved evidence');
    consoleSpy.mockRestore();
  });

  test('uses independent providers before second models from one quota pool', () => {
    const { __test } = loadRag({
      GEMINI_API_KEY: 'gemini-key',
      GROQ_API_KEY: 'groq-key',
      RAG_MAX_MODEL_ATTEMPTS: '2',
    });
    expect(__test.buildProviderAttempts().map(({ provider, model }) => ({ provider, model })))
      .toEqual([
        { provider: 'gemini', model: 'gemini-3.5-flash' },
        { provider: 'groq', model: 'openai/gpt-oss-20b' },
      ]);
  });

  test('caches a successful first-turn response and its citations', async () => {
    mockCompletionCreate.mockResolvedValue({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: '### 📖 The Teaching\nAct sincerely.\n\n### 🕉️ Key Verse(s)\nChapter 2 Verse 47 [S1] is the source.\n\n### 🌿 Practical Takeaway\nFocus on effort.',
        },
      }],
      usage: {},
    });
    const { askRag } = loadRag({
      GEMINI_API_KEY: 'test-key',
      RAG_CACHE_ENABLED: 'true',
    });

    const first = await askRag('What does the Gita teach about duty?');
    const second = await askRag('  what does the gita teach about duty?  ');

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.citations).toEqual(first.citations);
    expect(mockCompletionCreate).toHaveBeenCalledTimes(1);
    expect(mockFindNearestVerses).toHaveBeenCalledTimes(1);
  });
});

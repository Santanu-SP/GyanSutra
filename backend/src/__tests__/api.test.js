process.env.NODE_ENV = 'test';

const mockGetDoc = jest.fn();
const mockFindNearestVerses = jest.fn();
const mockCollections = {
  chapters: jest.fn(),
  verses: jest.fn(),
  stories: jest.fn(),
  users: jest.fn(),
  qaLog: jest.fn(),
};
const mockEmbedText = jest.fn();
const mockAskRag = jest.fn();
const mockLogQaCall = jest.fn();
const mockTranslateVerseContent = jest.fn();

jest.mock('../services/firestore', () => ({
  collections: mockCollections,
  getDoc: mockGetDoc,
  findNearestVerses: mockFindNearestVerses,
}));

jest.mock('../services/embedding', () => ({
  embedText: mockEmbedText,
}));

jest.mock('../services/rag', () => ({
  askRag: mockAskRag,
  logQaCall: mockLogQaCall,
}));

jest.mock('../services/verseTranslation', () => ({
  TARGET_LANGUAGES: { bn: {}, mr: {}, te: {}, ta: {} },
  translateVerseContent: mockTranslateVerseContent,
}));

const request = require('supertest');
const app = require('../app');

describe('Gyan Sutra API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockResolvedValue(null);
    mockEmbedText.mockResolvedValue(new Array(384).fill(0));
    mockFindNearestVerses.mockResolvedValue([]);
    mockAskRag.mockResolvedValue({
      answered: true,
      answer: 'A grounded answer.',
      citations: [],
      topSimilarity: 0,
      cached: false,
      degraded: false,
      reason: 'generated',
      _diagnostics: { timings: { totalMs: 12 } },
    });
    mockLogQaCall.mockResolvedValue(undefined);
    mockTranslateVerseContent.mockResolvedValue({
      requestedLanguage: 'bn',
      language: 'bn',
      translation: 'বাংলা অনুবাদ',
      explanation: 'বাংলা ব্যাখ্যা',
      context: '',
      wordMeanings: [],
      status: 'machine-assisted-unreviewed',
    });
  });

  test('reports health without caching the response', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.status).toBe('ok');
    expect(response.body.uptimeSeconds).toEqual(expect.any(Number));
  });

  test('rejects disallowed browser origins with a 403', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://malicious.example')
      .expect(403);

    expect(response.body).toEqual({ error: 'Origin is not allowed by CORS.' });
  });

  test('returns a clear 400 response for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/ask')
      .set('Content-Type', 'application/json')
      .send('{"question":')
      .expect(400);

    expect(response.body).toEqual({ error: 'Request body contains invalid JSON.' });
  });

  test('validates search limits before starting an embedding', async () => {
    const response = await request(app)
      .get('/api/search?q=duty&limit=-1')
      .expect(400);

    expect(response.body.error).toMatch(/Limit must be an integer/);
    expect(mockEmbedText).not.toHaveBeenCalled();
  });

  test('uses a validated search limit for vector retrieval', async () => {
    await request(app)
      .get('/api/search?q=duty&limit=3')
      .expect(200);

    expect(mockEmbedText).toHaveBeenCalledWith('duty', { inputType: 'query' });
    expect(mockFindNearestVerses).toHaveBeenCalledWith(expect.any(Array), 6);
  });

  test('returns one verse by document ID and removes its embedding', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'bhagavad-gita_9_30',
      chapterNumber: 9,
      verseNumber: 30,
      sanskrit: 'verse text',
      embedding: { private: true },
    });

    const response = await request(app)
      .get('/api/verses/bhagavad-gita_9_30')
      .expect(200);

    expect(response.body.id).toBe('bhagavad-gita_9_30');
    expect(response.body.embedding).toBeUndefined();
  });

  test('returns localized verse content for a supported reading language', async () => {
    const verse = {
      id: 'bhagavad-gita_2_47',
      chapterNumber: 2,
      verseNumber: 47,
      translationEnglish: 'You have a right to action.',
    };
    mockGetDoc.mockResolvedValue(verse);

    const response = await request(app)
      .get('/api/verses/bhagavad-gita_2_47/localized?language=bn')
      .expect(200);

    expect(mockTranslateVerseContent).toHaveBeenCalledWith(verse, 'bn');
    expect(response.body.content.translation).toBe('বাংলা অনুবাদ');
    expect(response.headers['cache-control']).toMatch(/max-age=86400/);
  });

  test('rejects unsupported verse translation languages', async () => {
    await request(app)
      .get('/api/verses/bhagavad-gita_2_47/localized?language=fr')
      .expect(400);

    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockTranslateVerseContent).not.toHaveBeenCalled();
  });

  test('rejects invalid Ramayana coordinates without querying Firestore', async () => {
    const response = await request(app)
      .get('/api/verses/ramayana/0/not-a-number')
      .expect(400);

    expect(response.body.error).toMatch(/valid positive numbers/);
    expect(mockCollections.verses).not.toHaveBeenCalled();
  });

  test('uses Firestore VectorValue data for recommendations', async () => {
    const vector = new Array(384).fill(0.01);
    mockCollections.verses.mockReturnValue({
      doc: () => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ embedding: { toArray: () => vector } }),
        }),
      }),
    });
    mockFindNearestVerses.mockResolvedValue([
      { id: 'source', similarity: 1 },
      { id: 'related', similarity: 0.8 },
    ]);

    const response = await request(app)
      .get('/api/recommendations/source')
      .expect(200);

    expect(mockFindNearestVerses).toHaveBeenCalledWith(vector, 11);
    expect(response.body.recommendations).toEqual([
      { id: 'related', similarity: 0.8 },
    ]);
  });

  test('removes a duplicated current question from conversation history', async () => {
    await request(app)
      .post('/api/ask')
      .send({
        question: 'What does duty mean?',
        history: [
          { role: 'sarathi', content: 'Earlier answer' },
          { role: 'user', content: 'What does duty mean?' },
        ],
      })
      .expect(200);

    expect(mockAskRag).toHaveBeenCalledWith(
      'What does duty mean?',
      [{ role: 'sarathi', content: 'Earlier answer' }],
      [],
    );
  });

  test('passes only validated prior citation IDs to follow-up retrieval', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({
        question: 'Explain that more',
        contextIds: [
          'bhagavad-gita_2_47',
          'not-a-document-id',
          'bhagavad-gita_2_47',
        ],
      })
      .expect(200);

    expect(mockAskRag).toHaveBeenCalledWith(
      'Explain that more',
      [],
      ['bhagavad-gita_2_47'],
    );
    expect(response.body._diagnostics).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  test('passes a validated response language to Sarathi', async () => {
    await request(app)
      .post('/api/ask')
      .send({ question: 'Explain Gita 2.47', language: 'bn' })
      .expect(200);

    expect(mockAskRag).toHaveBeenCalledWith('Explain Gita 2.47', [], [], 'bn');
  });

  test('does not expose internal server errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDoc.mockRejectedValue(new Error('private database detail'));

    const response = await request(app)
      .get('/api/verses/bhagavad-gita_9_30')
      .expect(500);

    expect(response.body).toEqual({ error: 'Internal server error.' });
    consoleSpy.mockRestore();
  });
});

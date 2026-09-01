const {
  buildRetrievalQuery,
  parseExplicitReference,
  parseExplicitReferences,
  rerankCandidates,
  unsupportedAnswerReferences,
} = require('../services/ragUtils');

describe('RAG utility behavior', () => {
  test.each([
    ['Gita 2.47', 'bhagavad-gita_2_47'],
    ['भगवद् गीता २.४७', 'bhagavad-gita_2_47'],
    ['chapter 18 verse 66', 'bhagavad-gita_18_66'],
    ['Ramayana 5.1.1', 'valmiki-ramayana_5_1_1'],
    ['Sundara Kanda, Sarga 1, Shloka 1', 'valmiki-ramayana_5_1_1'],
  ])('parses %s as %s', (question, expectedId) => {
    expect(parseExplicitReference(question)?.id).toBe(expectedId);
  });

  test('adds the previous topic only for an ambiguous follow-up', () => {
    const history = [{ role: 'user', content: 'What does the Gita teach about duty?' }];
    expect(buildRetrievalQuery('Explain that more', history))
      .toContain('What does the Gita teach about duty?');
    expect(buildRetrievalQuery('What does the Ramayana teach about courage in Sundara Kanda?', history))
      .not.toContain('Previous question');
  });

  test('collects multiple explicit references for comparison questions', () => {
    expect(parseExplicitReferences('Compare Gita 2.47 and 3.19').map(reference => reference.id))
      .toEqual(['bhagavad-gita_2_47', 'bhagavad-gita_3_19']);
    expect(parseExplicitReferences('Compare Gita 2-47 and 3-19').map(reference => reference.id))
      .toEqual(['bhagavad-gita_2_47', 'bhagavad-gita_3_19']);
  });

  test('uses lexical overlap as a small reranking signal', () => {
    const candidates = [
      { id: 'a', similarity: 0.8, translationEnglish: 'knowledge and meditation' },
      { id: 'b', similarity: 0.79, translationEnglish: 'selfless duty and action' },
    ];
    expect(rerankCandidates(candidates, 'selfless duty')[0].id).toBe('b');
  });

  test('detects source markers and verse references outside the evidence set', () => {
    const answer = 'Chapter 18 Verse 66 [S3]';
    expect(unsupportedAnswerReferences(answer, ['bhagavad-gita_2_47'], 1))
      .toEqual(expect.arrayContaining(['Chapter 18 Verse 66', '[S3]']));
  });
});

/**
 * Search — full semantic search results page.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import './Search.css';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q || q.length < 3) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    searchVerses(q)
      .then((data) => setResults(data.results || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <main className="search-page">
      <header className="search-page__header">
        <h1 className="search-page__heading">Search the Gita</h1>
        <SearchBar autoFocus={!q} placeholder="Search verses by meaning, concept, or keyword…" />
      </header>

      {/* Results */}
      <div className="search-page__results">
        {loading && (
          <LoadingSpinner size="medium" text="Searching scriptures..." />
        )}

        {!loading && searched && !error && results.length === 0 && (
          <div className="search-page__empty">
            <p className="search-page__empty-text">
              No verses found for "<strong>{q}</strong>"
            </p>
            <p className="search-page__empty-hint">
              Try a broader term or phrase from the scriptures — e.g. "duty", "soul", "peace of mind".
            </p>
            <div className="search-page__sarathi-suggest" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Or ask Sarathi directly about this concept:</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', { detail: { prompt: q } }))}
                className="inline-flex items-center justify-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] hover:border-amber-400/60 transition"
                style={{ cursor: 'pointer' }}
              >
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                  <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
                </svg>
                Ask Sarathi
              </button>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="search-page__error" role="alert">
            <p>Search failed: {error}</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="search-page__meta">
              {results.length} {results.length === 1 ? 'verse' : 'verses'} matching
              "<em>{q}</em>" — ordered by relevance
            </p>
            <div className="search-page__list">
              {results.map((verse) => (
                <IlluminatedVerseCard
                  key={verse.id}
                  verse={verse}
                  variant="compact"
                  similarity={verse.similarity}
                  onClick={(v) => navigate(`/verses/${v.id}`)}
                />
              ))}
            </div>
            <div className="search-page__sarathi-suggest" style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px' }}>
                Still seeking more insights? Let Sarathi analyze the scriptures and give you a comprehensive answer.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', { detail: { prompt: q } }))}
                className="inline-flex items-center justify-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] hover:border-amber-400/60 transition"
                style={{ cursor: 'pointer' }}
              >
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                  <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
                </svg>
                Ask Sarathi about "{q}"
              </button>
            </div>
          </>
        )}

        {!q && !loading && (
          <div className="search-page__idle">
            <p className="search-page__idle-text">
              Ask anything — the Gita likely has a teaching for it.
            </p>
            <div className="search-page__suggestions">
              {['What is the nature of the soul?', 'How to find peace?', 'What is duty?', 'Liberation from sorrow'].map(s => (
                <button
                  key={s}
                  className="search-page__suggestion"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

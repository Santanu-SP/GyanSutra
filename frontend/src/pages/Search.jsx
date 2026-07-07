/**
 * Search — full semantic search results page.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import SearchBar from '../components/SearchBar';
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
          <div className="search-page__loading" role="status">
            <div className="diya-flicker search-page__diya-dot" aria-hidden="true">✦</div>
            <span>Searching…</span>
          </div>
        )}

        {!loading && searched && !error && results.length === 0 && (
          <div className="search-page__empty">
            <p className="search-page__empty-text">
              No verses found for "<strong>{q}</strong>"
            </p>
            <p className="search-page__empty-hint">
              Try a broader term or phrase from the Gita — e.g. "duty", "soul", "peace of mind".
            </p>
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

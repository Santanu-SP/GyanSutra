/**
 * Search - full semantic search results page.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';

import './Search.css';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all'; // 'all', 'gita', 'ramayana'

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q || q.length < 3) {
      setResults([]);
      setError(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);
    let cancelled = false;

    searchVerses(q)
      .then((data) => {
        if (!cancelled) setResults(data.results || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  const displayedResults = results.filter(v => {
    if (filter === 'gita') return !v.id?.includes('ramayana');
    if (filter === 'ramayana') return v.id?.includes('ramayana');
    return true;
  });

  return (
    <main className="search-page">
      <header className="search-page__header">
        <h1 className="search-page__heading">Search Scriptures</h1>
        <SearchBar autoFocus={!q} placeholder="Search by topic, phrase, or keyword" />
        
        <div className="search-page__filters" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {['all', 'gita', 'ramayana'].map(f => (
            <AnimatedButton
              key={f}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('filter', f);
                setSearchParams(params);
              }}
              className={`active-press search-page__filter-btn ${filter === f ? 'active' : ''}`}
              style={{
                padding: '0.4rem 1rem',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRadius: '20px',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: filter === f ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                color: filter === f ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f === 'all' ? 'All Texts' : f === 'gita' ? 'Bhagavad Gita' : 'Ramayana'}
            </AnimatedButton>
          ))}
        </div>
      </header>

      {/* Results */}
      <div className="search-page__results">
        {loading && (
          <LoadingSpinner size="medium" text="Searching scriptures..." />
        )}

        {!loading && searched && !error && displayedResults.length === 0 && (
          <div className="search-page__empty">
            <p className="search-page__empty-text">
              No verses found for "<strong>{q}</strong>"
            </p>
            <p className="search-page__empty-hint">
              Try a broader phrase, such as “duty”, “soul”, or “peace of mind”.
            </p>
            <div className="search-page__sarathi-suggest" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Or ask Sarathi directly about this concept:</p>
              <AnimatedButton
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', { detail: { prompt: q } }))}
                className="active-press inline-flex items-center justify-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-[color:var(--text-primary)] hover:border-amber-400/60 transition"
                style={{ cursor: 'pointer' }}
              >
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                  <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
                </svg>
                Ask Sarathi
              </AnimatedButton>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="search-page__error" role="alert">
            <p>Search failed: {error}</p>
          </div>
        )}

        {!loading && searched && !error && displayedResults.length > 0 && (
          <>
            <p className="search-page__meta">
              {displayedResults.length} {displayedResults.length === 1 ? 'verse' : 'verses'} matching “<em>{q}</em>”, ordered by relevance
            </p>
            <div className="search-page__list">
              {displayedResults.map((verse, idx) => (
                <div key={verse.id} className="stagger-item" style={{ '--stagger-idx': idx }}>
                  <IlluminatedVerseCard
                    verse={verse}
                    variant="compact"
                    similarity={verse.similarity}
                    onClick={(v) => navigate(`/verses/${v.id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {!q && !loading && (
          <div className="search-page__idle">
            <p className="search-page__idle-text">
              Search for an idea, a phrase, or a question from the texts.
            </p>
            <div className="search-page__suggestions">
              {['What is the nature of the soul?', 'How to find peace?', 'What is duty?', 'Liberation from sorrow'].map((s, idx) => (
                <AnimatedButton
                  key={s}
                  className="active-press stagger-item search-page__suggestion"
                  style={{ '--stagger-idx': idx }}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                >
                  {s}
                </AnimatedButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

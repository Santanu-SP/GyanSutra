/**
 * TextReader — Chapter Navigator for Bhagavad Gita.
 * Shows a "Coming Soon" screen for sources not yet available.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAllChapters } from '../services/api';
import SearchBar from '../components/SearchBar';
import './TextReader.css';

// Static source metadata — avoids an extra backend round-trip
const SOURCE_META = {
  'bhagavad-gita': {
    title: 'Bhagavad Gita',
    description: 'A foundational dialogue on duty, devotion, and self-knowledge.',
    devanagari: 'श्रीमद्भगवद्गीता',
    available: true,
  },
  'upanishads': {
    title: 'Upanishads',
    description: 'A contemplative collection exploring the self, reality, and liberation.',
    devanagari: 'उपनिषद्',
    available: false,
  },
  'ramayana': {
    title: 'Ramayana',
    description: 'An epic text centered on dharma, exile, loyalty, and return.',
    devanagari: 'रामायण',
    available: false,
  },
};

// Roman numerals for chapter numbers — more manuscript-like than Arabic
const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII',
];

export default function TextReader() {
  const { source_id } = useParams();
  const meta = SOURCE_META[source_id] || {
    title: source_id,
    description: '',
    devanagari: 'ॐ',
    available: false,
  };
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(meta.available);
  const [error, setError]     = useState('');
  const [jumpInput, setJumpInput] = useState('');

  useEffect(() => {
    // Only fetch chapters for sources that are actually available
    if (!meta.available) return;

    setLoading(true);
    setError('');

    getAllChapters()
      .then((chaptersData) => {
        const list = Array.isArray(chaptersData)
          ? chaptersData
          : (chaptersData.chapters || []);
        setChapters(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source_id]);

  // Chapter / verse reference jump (e.g. "3" → chapter 3, "3.16" → ch 3 start)
  function handleJump(e) {
    e.preventDefault();
    const clean = jumpInput.trim();
    if (!clean) return;

    const parts = clean.split(/[.:]/);
    const chNum = parseInt(parts[0], 10);
    if (!isNaN(chNum) && chNum >= 1 && chNum <= 18) {
      window.location.href = `/chapters/chapter_${chNum}`;
    }
  }

  // ── Coming Soon view for sources not yet available ────────────────────
  if (!meta.available) {
    return (
      <main className="text-reader">
        <div className="text-reader__container">
          <Link to="/" className="text-reader__back">← Library</Link>
          <header className="text-reader__header">
            <p className="text-reader__source-badge">Sacred Scripture</p>
            <h1 className="text-reader__title">{meta.title}</h1>
            <p className="text-reader__devanagari devanagari">{meta.devanagari}</p>
            {meta.description && (
              <p className="text-reader__description">{meta.description}</p>
            )}
          </header>
          <hr className="gold-rule" />
          <div className="text-reader__coming-soon">
            <div className="text-reader__coming-soon-icon" aria-hidden="true">ॐ</div>
            <h2 className="text-reader__coming-soon-title">Coming Soon</h2>
            <p className="text-reader__coming-soon-body">
              The <strong>{meta.title}</strong> is being carefully transcribed and curated for this library.
              It will be available soon. Begin your journey with the Bhagavad Gita in the meantime.
            </p>
            <Link
              to="/bhagavad-gita"
              className="text-reader__coming-soon-cta"
            >
              Begin with Bhagavad Gita →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="text-reader">
      <div className="text-reader__container">

        {/* Back link */}
        <Link to="/" className="text-reader__back">
          ← Library
        </Link>

        {/* Source header */}
        <header className="text-reader__header">
          <p className="text-reader__source-badge">Sacred Scripture</p>
          <h1 className="text-reader__title">{meta.title}</h1>
          <p className="text-reader__devanagari devanagari">{meta.devanagari}</p>
          {meta.description && (
            <p className="text-reader__description">{meta.description}</p>
          )}
        </header>

        {/* Search + jump navigation bar */}
        <div className="text-reader__nav-bar">
          <div className="text-reader__search-wrap">
            <SearchBar placeholder="Search by meaning, topic, or keyword…" />
          </div>
          <form
            className="text-reader__jump"
            onSubmit={handleJump}
            aria-label="Jump to chapter or verse"
          >
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="e.g. 3 or 3.16"
              className="text-reader__jump-input"
              aria-label="Chapter or verse reference"
              id="chapter-jump-input"
            />
            <button
              type="submit"
              className="text-reader__jump-btn"
              id="chapter-jump-btn"
            >
              Go
            </button>
          </form>
        </div>

        <hr className="gold-rule" />

        {/* Loading state */}
        {loading && (
          <div className="text-reader__loading" role="status">
            <span className="diya-flicker text-reader__loading-dot" aria-hidden="true">✦</span>
            <span>Loading chapters…</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <p className="text-reader__error">Could not load chapters: {error}</p>
        )}

        {/* ── Chapter list — table-of-contents style ─────────────── */}
        {!loading && !error && chapters.length > 0 && (
          <ol
            className="text-reader__chapter-list"
            aria-label="Chapters of the Bhagavad Gita"
          >
            {chapters.map((chapter) => (
              <li
                key={chapter.id || chapter.number}
                className="text-reader__chapter-item"
              >
                <Link
                  to={`/chapters/chapter_${chapter.number}`}
                  className="text-reader__chapter-row"
                  id={`chapter-link-${chapter.number}`}
                  aria-label={`Chapter ${chapter.number}: ${chapter.titleEnglish}`}
                >
                  {/* Roman numeral */}
                  <span
                    className="text-reader__roman"
                    aria-hidden="true"
                  >
                    {ROMAN[chapter.number - 1] || chapter.number}
                  </span>

                  {/* Chapter details */}
                  <div className="text-reader__chapter-info">
                    {chapter.titleSanskrit && (
                      <span className="text-reader__chapter-sanskrit devanagari">
                        {chapter.titleSanskrit}
                      </span>
                    )}
                    <span className="text-reader__chapter-english">
                      {chapter.titleEnglish}
                    </span>
                    {chapter.summary && (
                      <span className="text-reader__chapter-summary">
                        {chapter.summary.length > 110
                          ? `${chapter.summary.slice(0, 110)}…`
                          : chapter.summary}
                      </span>
                    )}
                  </div>

                  {/* Meta + arrow */}
                  <div className="text-reader__chapter-meta">
                    {chapter.verseCount > 0 && (
                      <span className="text-reader__verse-count">
                        {chapter.verseCount} verses
                      </span>
                    )}
                    <span
                      className="text-reader__arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {/* Empty state */}
        {!loading && !error && chapters.length === 0 && (
          <p className="text-reader__empty">No chapters found.</p>
        )}

      </div>
    </main>
  );
}

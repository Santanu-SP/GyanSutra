/**
 * TextReader — redesigned as a Chapter Navigator.
 *
 * Instead of dumping all verses in a flat list, this page shows:
 *   - Source title + description
 *   - Unified search + chapter/verse jump bar
 *   - All 18 chapters in a table-of-contents style (like a physical book)
 *
 * For sources other than bhagavad-gita, falls back gracefully.
 * All API calls preserved. Layout and presentation only changed.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSources, getAllChapters } from '../services/api';
import SearchBar from '../components/SearchBar';
import './TextReader.css';

// Roman numerals for chapter numbers — more manuscript-like than Arabic
const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII',
];

export default function TextReader() {
  const { source_id } = useParams();
  const [source, setSource]   = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [jumpInput, setJumpInput] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([getSources(), getAllChapters()])
      .then(([sources, chaptersData]) => {
        setSource(sources.find((s) => s.id === source_id) || null);
        // API may return { chapters: [...] } or just an array
        const list = Array.isArray(chaptersData)
          ? chaptersData
          : (chaptersData.chapters || []);
        setChapters(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

  return (
    <main className="text-reader">
      <div className="text-reader__container">

        {/* Back link */}
        <Link to="/" className="text-reader__back">
          ← Library
        </Link>

        {/* Source header */}
        {source && (
          <header className="text-reader__header">
            <p className="text-reader__source-badge">Sacred Scripture</p>
            <h1 className="text-reader__title">{source.title}</h1>
            {source.description && (
              <p className="text-reader__description">{source.description}</p>
            )}
          </header>
        )}

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

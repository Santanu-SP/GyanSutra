/**
 * ChapterReader — reads all verses in a chapter.
 * Shows one verse at a time with prev/next navigation.
 * Page-turn animation between verses.
 * Triggers PWA install prompt after the last verse.
 *
 * Additions (non-breaking, UI only):
 *   - Compact chapter strip at the top — quick jump between chapters
 *   - Verse jump dropdown in the nav bar — jump to any verse directly
 *   - Back link navigates to the source (bhagavad-gita) not just /
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChapter, getChapterVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import RecommendationsRail from '../components/RecommendationsRail';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { filterVerses } from '../utils/verseUtils';
import './ChapterReader.css';

// All 18 chapter numbers for the strip
const CHAPTERS = Array.from({ length: 18 }, (_, i) => i + 1);

export default function ChapterReader() {
  const { id } = useParams();
  const [chapter, setChapter]           = useState(null);
  const [verses, setVerses]             = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [animClass, setAnimClass]       = useState('');
  const { canInstall, triggerInstall }  = usePWAInstall();

  useEffect(() => {
    setLoading(true);
    setCurrentIndex(0);
    Promise.all([getChapter(id), getChapterVerses(id)])
      .then(([ch, { verses: vs }]) => {
        setChapter(ch);
        setVerses(vs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const goTo = useCallback((newIndex) => {
    setAnimClass('page-turn-exit');
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setAnimClass('page-turn-enter');
      setTimeout(() => setAnimClass(''), 350);
    }, 200);
  }, []);

  const handlePrev = () => { if (currentIndex > 0) goTo(currentIndex - 1); };
  const handleNext = () => {
    if (currentIndex < verses.length - 1) {
      goTo(currentIndex + 1);
    } else if (canInstall) {
      triggerInstall();
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) goTo(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < verses.length - 1) {
          goTo(currentIndex + 1);
        } else if (canInstall) {
          triggerInstall();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, verses, canInstall, triggerInstall, goTo]);

  const isLastVerse   = currentIndex === verses.length - 1;
  const currentVerse  = verses[currentIndex];

  if (error) return (
    <main className="chapter-reader chapter-reader--error">
      <Link to="/bhagavad-gita" className="chapter-reader__back">← Chapters</Link>
      <p>Could not load chapter: {error}</p>
    </main>
  );

  return (
    <main className="chapter-reader">

      {/* ── Chapter header ────────────────────────────────────────── */}
      {chapter && !loading && (
        <header className="chapter-reader__header">
          <Link
            to="/bhagavad-gita"
            className="chapter-reader__back"
            id="back-to-home-link"
          >
            ← All Chapters
          </Link>
          <div className="chapter-reader__title-block">
            <span className="chapter-reader__chapter-num">
              Chapter {chapter.number}
            </span>
            <h1 className="chapter-reader__title devanagari">
              {chapter.titleSanskrit}
            </h1>
            <p className="chapter-reader__title-en">{chapter.titleEnglish}</p>
          </div>
          <hr className="gold-rule" />
          {chapter.summary && (
            <p className="chapter-reader__summary">{chapter.summary}</p>
          )}
          <hr className="gold-rule" />
        </header>
      )}

      {/* ── Compact chapter strip — quick jump to any chapter ─────── */}
      {!loading && (
        <nav
          className="chapter-strip"
          aria-label="Jump to chapter"
        >
          {CHAPTERS.map((num) => (
            <Link
              key={num}
              to={`/chapters/chapter_${num}`}
              className={`chapter-strip__tab${chapter?.number === num ? ' chapter-strip__tab--active' : ''}`}
              aria-label={`Chapter ${num}`}
              aria-current={chapter?.number === num ? 'page' : undefined}
              id={`chapter-strip-tab-${num}`}
            >
              {num}
            </Link>
          ))}
        </nav>
      )}

      {/* ── Progress bar ──────────────────────────────────────────── */}
      {!loading && verses.length > 0 && (
        <div className="chapter-reader__progress">
          <div
            className="chapter-reader__progress-bar"
            style={{ width: `${((currentIndex + 1) / verses.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemax={verses.length}
            aria-label={`Verse ${currentIndex + 1} of ${verses.length}`}
          />
        </div>
      )}

      {/* ── Current verse ─────────────────────────────────────────── */}
      <div className="chapter-reader__verse-area">
        {loading ? (
          <div className="chapter-reader__skeleton" aria-hidden="true">
            <div style={{ height: '320px', background: 'var(--bg-surface)', border: 'var(--hairline)' }} />
          </div>
        ) : currentVerse ? (
          <div className={animClass} key={currentVerse.id}>
            <IlluminatedVerseCard verse={currentVerse} variant="full" />
          </div>
        ) : (
          <p>No verses found for this chapter.</p>
        )}
      </div>

      {/* ── Verse navigation: prev / verse-jump select / next ─────── */}
      {!loading && verses.length > 0 && (
        <nav className="chapter-reader__nav" aria-label="Verse navigation">
          <button
            className="chapter-reader__nav-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            id="prev-verse-btn"
            aria-label="Previous verse"
          >
            ← Previous
          </button>

          {/* Verse jump dropdown */}
          <div className="chapter-reader__jump-wrap">
            <label htmlFor="verse-jump-select" className="sr-only">
              Jump to verse
            </label>
            <select
              id="verse-jump-select"
              className="chapter-reader__verse-select"
              value={currentIndex}
              onChange={(e) => goTo(Number(e.target.value))}
              aria-label="Jump to verse"
            >
              {verses.map((v, idx) => (
                <option key={v.id} value={idx}>
                  Verse {v.verseNumber}
                </option>
              ))}
            </select>
            <span className="chapter-reader__verse-total">
              / {verses.length}
            </span>
          </div>

          <button
            className={`chapter-reader__nav-btn chapter-reader__nav-btn--next${isLastVerse ? ' chapter-reader__nav-btn--finish' : ''}`}
            onClick={handleNext}
            id="next-verse-btn"
            aria-label={isLastVerse ? 'Finish chapter' : 'Next verse'}
          >
            {isLastVerse
              ? (canInstall ? 'Finish & Install ✦' : 'Chapter Complete ✦')
              : 'Next →'}
          </button>
        </nav>
      )}

      {/* ── Recommendations — shown at chapter end ─────────────────── */}
      {!loading && isLastVerse && currentVerse && (
        <div className="chapter-reader__recos">
          <RecommendationsRail contentId={currentVerse.id} type="verse" />
        </div>
      )}

      {/* ── Prev / Next chapter links ──────────────────────────────── */}
      {!loading && chapter && (
        <div className="chapter-reader__chapter-links">
          <hr className="gold-rule" />
          <div className="chapter-reader__chapter-links-grid">
            {chapter.number > 1 && (
              <Link
                to={`/chapters/chapter_${chapter.number - 1}`}
                className="chapter-reader__chapter-link"
              >
                ← Chapter {chapter.number - 1}
              </Link>
            )}
            <Link
              to="/bhagavad-gita"
              className="chapter-reader__chapter-link chapter-reader__chapter-link--home"
            >
              All Chapters
            </Link>
            {chapter.number < 18 && (
              <Link
                to={`/chapters/chapter_${chapter.number + 1}`}
                className="chapter-reader__chapter-link"
              >
                Chapter {chapter.number + 1} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Floating Side Navigation */}
      {!loading && verses.length > 0 && (
        <>
          <button
            className="floating-nav-btn floating-nav-btn--prev"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous verse"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <button
            className="floating-nav-btn floating-nav-btn--next"
            onClick={handleNext}
            disabled={isLastVerse}
            aria-label="Next verse"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </>
      )}
    </main>
  );
}

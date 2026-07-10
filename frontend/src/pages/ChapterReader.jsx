/**
 * ChapterReader — reads all verses in a chapter.
 * Shows one verse at a time with prev/next navigation.
 * Page-turn animation between verses.
 * Triggers PWA install prompt after the last verse.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getChapter, getChapterVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import RecommendationsRail from '../components/RecommendationsRail';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { filterVerses } from '../utils/verseUtils';
import './ChapterReader.css';

export default function ChapterReader() {
  const { id } = useParams();
  const [chapter, setChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animClass, setAnimClass] = useState('');
  const { canInstall, triggerInstall } = usePWAInstall();

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
      // Finished the chapter — natural moment to offer install
      triggerInstall();
    }
  };

  const isLastVerse = currentIndex === verses.length - 1;
  const currentVerse = verses[currentIndex];

  if (error) return (
    <main className="chapter-reader chapter-reader--error">
      <Link to="/" className="chapter-reader__back">← Home</Link>
      <p>Could not load chapter: {error}</p>
    </main>
  );

  return (
    <main className="chapter-reader">
      {/* Chapter header */}
      {chapter && !loading && (
        <header className="chapter-reader__header">
          <Link to="/" className="chapter-reader__back" id="back-to-home-link">← Gyan Sutra</Link>
          <div className="chapter-reader__title-block">
            <span className="chapter-reader__chapter-num">
              Chapter {chapter.number}
            </span>
            <h1 className="chapter-reader__title devanagari">{chapter.titleSanskrit}</h1>
            <p className="chapter-reader__title-en">{chapter.titleEnglish}</p>
          </div>
          <hr className="gold-rule" />
          {chapter.summary && (
            <p className="chapter-reader__summary">{chapter.summary}</p>
          )}
          <hr className="gold-rule" />
        </header>
      )}

      {/* Verse navigation — progress + verse counter */}
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

      {/* Current verse */}
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

      {/* Prev / Next navigation */}
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
          <span className="chapter-reader__nav-label">
            {currentIndex + 1} / {verses.length}
          </span>
          <button
            className={`chapter-reader__nav-btn chapter-reader__nav-btn--next ${isLastVerse ? 'chapter-reader__nav-btn--finish' : ''}`}
            onClick={handleNext}
            id="next-verse-btn"
            aria-label={isLastVerse ? 'Finish chapter' : 'Next verse'}
          >
            {isLastVerse ? (canInstall ? 'Finish & Install App ✦' : 'Chapter Complete ✦') : 'Next →'}
          </button>
        </nav>
      )}

      {/* Recommendations — shown at chapter end */}
      {!loading && isLastVerse && currentVerse && (
        <div className="chapter-reader__recos">
          <RecommendationsRail contentId={currentVerse.id} type="verse" />
        </div>
      )}

      {/* Chapter quick-jump */}
      {!loading && chapter && (
        <div className="chapter-reader__chapter-links">
          <hr className="gold-rule" />
          <div className="chapter-reader__chapter-links-grid">
            {chapter.number > 1 && (
              <Link to={`/chapters/chapter_${chapter.number - 1}`} className="chapter-reader__chapter-link">
                ← Chapter {chapter.number - 1}
              </Link>
            )}
            <Link to="/" className="chapter-reader__chapter-link chapter-reader__chapter-link--home">
              All Chapters
            </Link>
            {chapter.number < 18 && (
              <Link to={`/chapters/chapter_${chapter.number + 1}`} className="chapter-reader__chapter-link">
                Chapter {chapter.number + 1} →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

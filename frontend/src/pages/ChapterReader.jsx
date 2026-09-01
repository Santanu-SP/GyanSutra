/**
 * ChapterReader - reads all verses in a chapter.
 * Shows one verse at a time with prev/next navigation.
 * Page-turn animation between verses.
 *
 * Additions (non-breaking, UI only):
 *   - Compact chapter strip at the top - quick jump between chapters
 *   - Verse jump dropdown in the nav bar - jump to any verse directly
 *   - Back link navigates to the source (bhagavad-gita) not just /
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { getChapter, getChapterVerses } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import RecommendationsRail from '../components/RecommendationsRail';
import AnimatedButton from '../components/AnimatedButton';
import useLanguage from '../i18n/useLanguage';

import './ChapterReader.css';

// All 18 chapter numbers for the strip
const CHAPTERS = Array.from({ length: 18 }, (_, i) => i + 1);

const READER_COPY = {
  en: { chapters: 'All Chapters', failed: 'Could not load chapter.', jumpChapter: 'Jump to chapter', loading: 'Loading chapter…', none: 'No verses found for this chapter.', navigation: 'Verse navigation', previous: 'Previous', next: 'Next', jumpVerse: 'Jump to verse', end: 'End of chapter' },
  hi: { chapters: 'सभी अध्याय', failed: 'अध्याय लोड नहीं हो सका।', jumpChapter: 'अध्याय पर जाएँ', loading: 'अध्याय खुल रहा है…', none: 'इस अध्याय में कोई श्लोक नहीं मिला।', navigation: 'श्लोक संचालन', previous: 'पिछला', next: 'अगला', jumpVerse: 'श्लोक पर जाएँ', end: 'अध्याय समाप्त' },
  bn: { chapters: 'সব অধ্যায়', failed: 'অধ্যায় লোড করা যায়নি।', jumpChapter: 'অধ্যায়ে যান', loading: 'অধ্যায় খুলছে…', none: 'এই অধ্যায়ে কোনো শ্লোক পাওয়া যায়নি।', navigation: 'শ্লোক পরিচালনা', previous: 'আগের', next: 'পরের', jumpVerse: 'শ্লোকে যান', end: 'অধ্যায় শেষ' },
  mr: { chapters: 'सर्व अध्याय', failed: 'अध्याय लोड होऊ शकला नाही.', jumpChapter: 'अध्यायावर जा', loading: 'अध्याय उघडत आहे…', none: 'या अध्यायात श्लोक सापडले नाहीत.', navigation: 'श्लोक नेव्हिगेशन', previous: 'मागील', next: 'पुढील', jumpVerse: 'श्लोकावर जा', end: 'अध्याय समाप्त' },
  te: { chapters: 'అన్ని అధ్యాయాలు', failed: 'అధ్యాయాన్ని లోడ్ చేయలేకపోయాం.', jumpChapter: 'అధ్యాయానికి వెళ్లండి', loading: 'అధ్యాయం తెరుచుకుంటోంది…', none: 'ఈ అధ్యాయంలో శ్లోకాలు దొరకలేదు.', navigation: 'శ్లోక నావిగేషన్', previous: 'మునుపటి', next: 'తదుపరి', jumpVerse: 'శ్లోకానికి వెళ్లండి', end: 'అధ్యాయం ముగిసింది' },
  ta: { chapters: 'அனைத்து அத்தியாயங்கள்', failed: 'அத்தியாயத்தை ஏற்ற முடியவில்லை.', jumpChapter: 'அத்தியாயத்திற்குச் செல்லவும்', loading: 'அத்தியாயம் திறக்கப்படுகிறது…', none: 'இந்த அத்தியாயத்தில் சுலோகங்கள் கிடைக்கவில்லை.', navigation: 'சுலோக வழிசெலுத்தல்', previous: 'முந்தையது', next: 'அடுத்தது', jumpVerse: 'சுலோகத்திற்குச் செல்லவும்', end: 'அத்தியாயம் முடிந்தது' },
};

export default function ChapterReader() {
  const { language, t } = useLanguage();
  const labels = READER_COPY[language] || READER_COPY.en;
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const requestedVerse = Number(searchParams.get('verse'));
  const [chapter, setChapter]           = useState(null);
  const [verses, setVerses]             = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [animClass, setAnimClass]       = useState('');

  useEffect(() => {
    setLoading(true);
    setCurrentIndex(0);
    setError(null);
    Promise.all([getChapter(id), getChapterVerses(id)])
      .then(([ch, versesRes]) => {
        setChapter(ch || null);
        const vs = Array.isArray(versesRes?.verses) ? versesRes.verses : [];
        setVerses(vs);
        const requestedIndex = Number.isFinite(requestedVerse) && requestedVerse > 0
          ? vs.findIndex((verse) => Number(verse.verseNumber) === requestedVerse)
          : -1;
        setCurrentIndex(requestedIndex >= 0 ? requestedIndex : 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load chapter:", err);
        setError(err?.message || 'Could not load chapter.');
        setLoading(false);
      });
  }, [id, requestedVerse]);

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
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, verses, goTo]);

  const isLastVerse   = currentIndex === verses.length - 1;
  const currentVerse  = verses[currentIndex];

  if (error) return (
    <main className="chapter-reader chapter-reader--error">
      <Link to="/bhagavad-gita" className="chapter-reader__back">← {labels.chapters}</Link>
      <p>{labels.failed}</p>
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
            ← {labels.chapters}
          </Link>
          <div className="chapter-reader__title-block">
            <span className="chapter-reader__chapter-num">
              {t('chapter')} {chapter.number}
            </span>
            <h1 className="chapter-reader__title devanagari">
              {chapter.titleSanskrit}
            </h1>
            {language === 'en' && <p className="chapter-reader__title-en">{chapter.titleEnglish}</p>}
          </div>
          <hr className="gold-rule" />
          {language === 'en' && chapter.summary && (
            <p className="chapter-reader__summary">{chapter.summary}</p>
          )}
          <hr className="gold-rule" />
        </header>
      )}

      {/* ── Compact chapter strip - quick jump to any chapter ─────── */}
      {!loading && (
        <nav
          className="chapter-strip"
          aria-label={labels.jumpChapter}
        >
          {CHAPTERS.map((num, idx) => (
            <Link
              key={num}
              to={`/chapters/chapter_${num}`}
              style={{ '--stagger-idx': idx }}
              className={`stagger-item hover-lift chapter-strip__tab${chapter?.number === num ? ' chapter-strip__tab--active' : ''}`}
              aria-label={`${t('chapter')} ${num}`}
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
            aria-label={`${t('verse')} ${currentIndex + 1} / ${verses.length}`}
          />
        </div>
      )}

      {/* ── Current verse ─────────────────────────────────────────── */}
      <div className="chapter-reader__verse-area">
        {loading ? (
          <LoadingSpinner size="medium" text={labels.loading} />
        ) : currentVerse ? (
          <div className={animClass} key={currentVerse.id}>
            <IlluminatedVerseCard verse={currentVerse} variant="full" />
          </div>
        ) : (
          <p>{labels.none}</p>
        )}
      </div>

      {/* ── Verse navigation: prev / verse-jump select / next ─────── */}
      {!loading && verses.length > 0 && (
        <nav className="chapter-reader__nav" aria-label={labels.navigation}>
          <AnimatedButton
            className="active-press chapter-reader__nav-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            id="prev-verse-btn"
            aria-label={`${labels.previous} ${t('verse')}`}
          >
            ← {labels.previous}
          </AnimatedButton>

          {/* Verse jump dropdown */}
          <div className="chapter-reader__jump-wrap">
            <label htmlFor="verse-jump-select" className="sr-only">
              {labels.jumpVerse}
            </label>
            <select
              id="verse-jump-select"
              className="chapter-reader__verse-select"
              value={currentIndex}
              onChange={(e) => goTo(Number(e.target.value))}
              aria-label={labels.jumpVerse}
            >
              {verses.map((v, idx) => (
                <option key={v.id} value={idx}>
                  {t('verse')} {v.verseNumber}
                </option>
              ))}
            </select>
            <span className="chapter-reader__verse-total">
              / {verses.length}
            </span>
          </div>

          <AnimatedButton
            className={`active-press chapter-reader__nav-btn chapter-reader__nav-btn--next${isLastVerse ? ' chapter-reader__nav-btn--finish' : ''}`}
            onClick={handleNext}
            disabled={isLastVerse}
            id="next-verse-btn"
            aria-label={isLastVerse ? labels.end : `${labels.next} ${t('verse')}`}
          >
            {isLastVerse ? labels.end : `${labels.next} →`}
          </AnimatedButton>
        </nav>
      )}

      {/* ── Recommendations - shown at chapter end ─────────────────── */}
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
                ← {t('chapter')} {chapter.number - 1}
              </Link>
            )}
            <Link
              to="/bhagavad-gita"
              className="chapter-reader__chapter-link chapter-reader__chapter-link--home"
            >
              {labels.chapters}
            </Link>
            {chapter.number < 18 && (
              <Link
                to={`/chapters/chapter_${chapter.number + 1}`}
                className="chapter-reader__chapter-link"
              >
                {t('chapter')} {chapter.number + 1} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Floating Side Navigation */}
      {!loading && verses.length > 0 && (
        <>
          <AnimatedButton
            className="floating-nav-btn floating-nav-btn--prev"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label={`${labels.previous} ${t('verse')}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </AnimatedButton>
          <AnimatedButton
            className="floating-nav-btn floating-nav-btn--next"
            onClick={handleNext}
            disabled={isLastVerse}
            aria-label={`${labels.next} ${t('verse')}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </AnimatedButton>
        </>
      )}
    </main>
  );
}

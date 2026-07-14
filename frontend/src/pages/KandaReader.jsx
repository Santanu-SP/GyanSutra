import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getRamayanaSarga } from '../services/api';
import './ChapterReader.css';

const KANDAS = [
  { id: 1, name: 'Bala Kanda', sargas: 77 },
  { id: 2, name: 'Ayodhya Kanda', sargas: 119 },
  { id: 3, name: 'Aranya Kanda', sargas: 75 },
  { id: 4, name: 'Kishkindha Kanda', sargas: 67 },
  { id: 5, name: 'Sundara Kanda', sargas: 68 },
  { id: 6, name: 'Yuddha Kanda', sargas: 128 },
  { id: 7, name: 'Uttara Kanda', sargas: 111 },
];

export default function KandaReader() {
  const { kandaNum } = useParams();
  const kandaId = parseInt(kandaNum, 10);
  const kanda = KANDAS.find(k => k.id === kandaId);
  
  const [currentSarga, setCurrentSarga] = useState(1);
  const [verses, setVerses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    if (!kanda) return;
    
    setLoading(true);
    setCurrentIndex(0);
    
    getRamayanaSarga(kandaId, currentSarga)
      .then(data => {
        setVerses(data.verses || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [kandaId, currentSarga, kanda]);

  const goTo = useCallback((newIndex) => {
    setAnimClass('page-turn-exit');
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setAnimClass('page-turn-enter');
      setTimeout(() => setAnimClass(''), 350);
    }, 200);
  }, []);

  const handlePrev = () => { 
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    } else if (currentSarga > 1) {
      setCurrentSarga(prev => prev - 1);
    }
  };
  
  const handleNext = () => {
    if (currentIndex < verses.length - 1) {
      goTo(currentIndex + 1);
    } else if (kanda && currentSarga < kanda.sargas) {
      setCurrentSarga(prev => prev + 1);
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
        if (currentIndex > 0) {
          goTo(currentIndex - 1);
        } else if (currentSarga > 1) {
          setCurrentSarga(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < verses.length - 1) {
          goTo(currentIndex + 1);
        } else if (kanda && currentSarga < kanda.sargas) {
          setCurrentSarga(prev => prev + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentSarga, verses, kanda, goTo]);

  const currentVerse = verses[currentIndex];

  if (!kanda) return (
    <main className="chapter-reader chapter-reader--error">
      <Link to="/ramayana" className="chapter-reader__back">← Ramayana</Link>
      <p>Kanda not found.</p>
    </main>
  );

  return (
    <main className="chapter-reader">
      <header className="chapter-reader__header">
        <Link to="/ramayana" className="chapter-reader__back" id="back-to-home-link">
          ← All Kandas
        </Link>
        <div className="chapter-reader__title-block">
          <h1 className="chapter-reader__title devanagari">{kanda.name}</h1>
          <div className="flex items-center gap-4 mt-4">
            <label className="text-[color:var(--text-secondary)] text-sm uppercase tracking-widest">Sarga:</label>
            <select 
              value={currentSarga}
              onChange={(e) => setCurrentSarga(parseInt(e.target.value, 10))}
              className="bg-transparent border border-amber-500/20 text-[color:var(--text-primary)] rounded px-2 py-1 outline-none"
            >
              {Array.from({ length: kanda.sargas }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="bg-[color:var(--bg-main)]">
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>
        <hr className="gold-rule" />
      </header>

      {loading && !error && (
        <LoadingSpinner size="medium" text="Loading Shlokas..." />
      )}

      {error && <p className="text-center text-red-400 mt-8">Error: {error}</p>}
      
      {!loading && !error && verses.length === 0 && (
        <div className="text-center mt-16 text-[color:var(--text-secondary)]">
          <p>No verses found for this Sarga yet.</p>
          <p className="text-sm mt-2">Only Bala Kanda Sarga 1 has been ingested in this trial.</p>
        </div>
      )}

      {!loading && verses.length > 0 && currentVerse && (
        <section className={`chapter-reader__content ${animClass}`}>
          <div className="chapter-reader__verse-nav mb-6 flex justify-between items-center text-[color:var(--text-secondary)]">
             <span className="text-sm">
                Shloka {currentIndex + 1} of {verses.length}
             </span>
             {currentVerse.verified === false && (
                <span className="text-xs border border-red-500/30 text-red-400 px-2 py-1 rounded-full uppercase tracking-wider">
                  Unverified
                </span>
             )}
          </div>
          
          <IlluminatedVerseCard verse={currentVerse} />
        </section>
      )}

      {/* ── Floating Navigation Controls ──────────────────────── */}
      {!loading && verses.length > 0 && (
        <nav className="chapter-reader__controls" aria-label="Verse Navigation">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 && currentSarga === 1}
            className="control-btn"
            aria-label="Previous shloka"
          >
            ←<span className="sr-only">Prev</span>
          </button>
          
          <span className="control-progress">
            {currentIndex + 1} / {verses.length}
          </span>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === verses.length - 1 && currentSarga === kanda.sargas}
            className="control-btn"
            aria-label="Next shloka"
          >
            <span className="sr-only">Next</span>→
          </button>
        </nav>
      )}

      {/* Floating Side Navigation */}
      {!loading && verses.length > 0 && (
        <>
          <button
            className="floating-nav-btn floating-nav-btn--prev"
            onClick={handlePrev}
            disabled={currentIndex === 0 && currentSarga === 1}
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
            disabled={currentIndex === verses.length - 1 && currentSarga === kanda.sargas}
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

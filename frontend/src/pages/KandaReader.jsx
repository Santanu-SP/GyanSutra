import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getRamayanaSarga } from '../services/api';
import AnimatedButton from '../components/AnimatedButton';
import useLanguage from '../i18n/useLanguage';
import KANDA_NAMES from '../utils/kandaNames';

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

const KANDA_COPY = {
  en: { all: 'All Kandas', missing: 'Kanda not found.', loading: 'Loading shlokas…', failed: 'Could not load this sarga.', none: 'No verses found for this Sarga.', choose: 'Try selecting a different Sarga above.', unverified: 'Unverified', previous: 'Previous shloka', next: 'Next shloka', navigation: 'Verse navigation', of: 'of' },
  hi: { all: 'सभी काण्ड', missing: 'काण्ड नहीं मिला।', loading: 'श्लोक खुल रहे हैं…', failed: 'यह सर्ग लोड नहीं हो सका।', none: 'इस सर्ग में कोई श्लोक नहीं मिला।', choose: 'ऊपर से कोई दूसरा सर्ग चुनें।', unverified: 'अप्रमाणित', previous: 'पिछला श्लोक', next: 'अगला श्लोक', navigation: 'श्लोक संचालन', of: 'में से' },
  bn: { all: 'সব কাণ্ড', missing: 'কাণ্ড পাওয়া যায়নি।', loading: 'শ্লোক খুলছে…', failed: 'এই সর্গ লোড করা যায়নি।', none: 'এই সর্গে কোনো শ্লোক পাওয়া যায়নি।', choose: 'উপরে অন্য একটি সর্গ বেছে নিন।', unverified: 'যাচাই করা হয়নি', previous: 'আগের শ্লোক', next: 'পরের শ্লোক', navigation: 'শ্লোক পরিচালনা', of: 'এর মধ্যে' },
  mr: { all: 'सर्व कांड', missing: 'कांड सापडले नाही.', loading: 'श्लोक उघडत आहेत…', failed: 'हा सर्ग लोड होऊ शकला नाही.', none: 'या सर्गात श्लोक सापडले नाहीत.', choose: 'वरून वेगळा सर्ग निवडा.', unverified: 'असत्यापित', previous: 'मागील श्लोक', next: 'पुढील श्लोक', navigation: 'श्लोक नेव्हिगेशन', of: 'पैकी' },
  te: { all: 'అన్ని కాండలు', missing: 'కాండ దొరకలేదు.', loading: 'శ్లోకాలు తెరుచుకుంటున్నాయి…', failed: 'ఈ సర్గను లోడ్ చేయలేకపోయాం.', none: 'ఈ సర్గలో శ్లోకాలు దొరకలేదు.', choose: 'పైన మరో సర్గను ఎంచుకోండి.', unverified: 'ధృవీకరించబడలేదు', previous: 'మునుపటి శ్లోకం', next: 'తదుపరి శ్లోకం', navigation: 'శ్లోక నావిగేషన్', of: 'లో' },
  ta: { all: 'அனைத்து காண்டங்கள்', missing: 'காண்டம் கிடைக்கவில்லை.', loading: 'சுலோகங்கள் திறக்கப்படுகின்றன…', failed: 'இந்தச் சர்க்கத்தை ஏற்ற முடியவில்லை.', none: 'இந்தச் சர்க்கத்தில் சுலோகங்கள் கிடைக்கவில்லை.', choose: 'மேலே வேறு சர்க்கத்தைத் தேர்ந்தெடுக்கவும்.', unverified: 'சரிபார்க்கப்படவில்லை', previous: 'முந்தைய சுலோகம்', next: 'அடுத்த சுலோகம்', navigation: 'சுலோக வழிசெலுத்தல்', of: 'இல்' },
};

export default function KandaReader() {
  const { language, t } = useLanguage();
  const labels = KANDA_COPY[language] || KANDA_COPY.en;
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
    setError(null);
    setCurrentIndex(0);
    
    getRamayanaSarga(kandaId, currentSarga)
      .then(data => {
        setVerses(data.verses || []);
        setError(null);
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
      <Link to="/ramayana" className="chapter-reader__back">← {t('ramayana')}</Link>
      <p>{labels.missing}</p>
    </main>
  );

  return (
    <main className="chapter-reader">
      <header className="chapter-reader__header">
        <Link to="/ramayana" className="chapter-reader__back" id="back-to-home-link">
          ← {labels.all}
        </Link>
        <div className="chapter-reader__title-block">
          <h1 className="chapter-reader__title devanagari">{KANDA_NAMES[language]?.[kanda.id - 1] || kanda.name}</h1>
          <div className="flex items-center gap-4 mt-4">
            <label htmlFor="sarga-select" className="text-[color:var(--text-secondary)] text-sm uppercase tracking-widest">{t('sarga')}</label>
            <select 
              id="sarga-select"
              value={currentSarga}
              onChange={(e) => setCurrentSarga(parseInt(e.target.value, 10))}
              className="min-h-11 bg-transparent border border-amber-500/20 text-[color:var(--text-primary)] rounded px-3 py-2 outline-none"
            >
              {Array.from({ length: kanda.sargas }, (_, i) => i + 1).map(num => (
                <option key={num} value={num} className="bg-[color:var(--bg-surface)]">
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>
        <hr className="gold-rule" />
      </header>

      {loading && !error && (
        <LoadingSpinner size="medium" text={labels.loading} />
      )}

      {error && <p className="text-center text-red-400 mt-8">{labels.failed}</p>}
      
      {!loading && !error && verses.length === 0 && (
        <div className="text-center mt-16 text-[color:var(--text-secondary)]">
          <p>{labels.none}</p>
          <p className="text-sm mt-2">{labels.choose}</p>
        </div>
      )}

      {!loading && verses.length > 0 && currentVerse && (
        <section className={`chapter-reader__content ${animClass}`}>
          <div className="chapter-reader__verse-nav mb-6 flex justify-between items-center text-[color:var(--text-secondary)]">
             <span className="text-sm">
                {t('shloka')} {currentIndex + 1} {labels.of} {verses.length}
             </span>
             {currentVerse.verified === false && (
                <span className="text-xs border border-red-500/30 text-red-400 px-2 py-1 rounded-full uppercase tracking-wider">
                  {labels.unverified}
                </span>
             )}
          </div>
          
          <IlluminatedVerseCard verse={currentVerse} />
        </section>
      )}

      {/* ── Floating Navigation Controls ──────────────────────── */}
      {!loading && verses.length > 0 && (
        <nav className="chapter-reader__controls" aria-label={labels.navigation}>
          <AnimatedButton
            onClick={handlePrev}
            disabled={currentIndex === 0 && currentSarga === 1}
            className="control-btn"
            aria-label={labels.previous}
          >
            ←<span className="sr-only">{labels.previous}</span>
          </AnimatedButton>
          
          <span className="control-progress">
            {currentIndex + 1} / {verses.length}
          </span>
          
          <AnimatedButton
            onClick={handleNext}
            disabled={currentIndex === verses.length - 1 && currentSarga === kanda.sargas}
            className="control-btn"
            aria-label={labels.next}
          >
            <span className="sr-only">{labels.next}</span>→
          </AnimatedButton>
        </nav>
      )}

    </main>
  );
}

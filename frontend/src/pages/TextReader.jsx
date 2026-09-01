/**
 * TextReader - Chapter Navigator for Bhagavad Gita.
 * Shows a "Coming Soon" screen for sources not yet available.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAllChapters } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedButton from '../components/AnimatedButton';
import useLanguage from '../i18n/useLanguage';

import './TextReader.css';

// Static source metadata - avoids an extra backend round-trip
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

// Roman numerals for chapter numbers - more manuscript-like than Arabic
const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII',
];

const READER_COPY = {
  en: { library: 'Library', preparation: 'In preparation', soon: 'Coming Soon', unavailable: 'is not available yet. You can read the Bhagavad Gita while this edition is prepared.', go: 'Go', loading: 'Loading chapters…', failed: 'Could not load chapters.', list: 'Chapters of the Bhagavad Gita', verses: 'verses', jump: 'Jump to chapter or verse', placeholder: 'e.g. 3 or 3.16' },
  hi: { library: 'पुस्तकालय', preparation: 'तैयारी में', soon: 'शीघ्र आ रहा है', unavailable: 'अभी उपलब्ध नहीं है। यह संस्करण तैयार होने तक आप भगवद्गीता पढ़ सकते हैं।', go: 'जाएँ', loading: 'अध्याय खुल रहे हैं…', failed: 'अध्याय लोड नहीं हो सके।', list: 'भगवद्गीता के अध्याय', verses: 'श्लोक', jump: 'अध्याय या श्लोक पर जाएँ', placeholder: 'जैसे 3 या 3.16' },
  bn: { library: 'গ্রন্থাগার', preparation: 'প্রস্তুতিতে', soon: 'শীঘ্র আসছে', unavailable: 'এখনও উপলব্ধ নয়। এই সংস্করণ প্রস্তুত হওয়া পর্যন্ত আপনি ভগবদ্গীতা পড়তে পারেন।', go: 'যান', loading: 'অধ্যায় খুলছে…', failed: 'অধ্যায় লোড করা যায়নি।', list: 'ভগবদ্গীতার অধ্যায়', verses: 'শ্লোক', jump: 'অধ্যায় বা শ্লোকে যান', placeholder: 'যেমন 3 বা 3.16' },
  mr: { library: 'ग्रंथालय', preparation: 'तयारीत', soon: 'लवकरच येत आहे', unavailable: 'अद्याप उपलब्ध नाही. ही आवृत्ती तयार होत असताना तुम्ही भगवद्गीता वाचू शकता.', go: 'जा', loading: 'अध्याय उघडत आहेत…', failed: 'अध्याय लोड होऊ शकले नाहीत.', list: 'भगवद्गीतेचे अध्याय', verses: 'श्लोक', jump: 'अध्याय किंवा श्लोकावर जा', placeholder: 'उदा. 3 किंवा 3.16' },
  te: { library: 'గ్రంథాలయం', preparation: 'సిద్ధమవుతోంది', soon: 'త్వరలో వస్తుంది', unavailable: 'ఇంకా అందుబాటులో లేదు. ఈ సంచిక సిద్ధమయ్యే వరకు మీరు భగవద్గీత చదవవచ్చు.', go: 'వెళ్లండి', loading: 'అధ్యాయాలు తెరుచుకుంటున్నాయి…', failed: 'అధ్యాయాలను లోడ్ చేయలేకపోయాం.', list: 'భగవద్గీత అధ్యాయాలు', verses: 'శ్లోకాలు', jump: 'అధ్యాయం లేదా శ్లోకానికి వెళ్లండి', placeholder: 'ఉదా. 3 లేదా 3.16' },
  ta: { library: 'நூலகம்', preparation: 'தயாரிப்பில்', soon: 'விரைவில் வருகிறது', unavailable: 'இன்னும் கிடைக்கவில்லை. இந்தப் பதிப்பு தயாராகும் வரை பகவத் கீதையைப் படிக்கலாம்.', go: 'செல்க', loading: 'அத்தியாயங்கள் திறக்கப்படுகின்றன…', failed: 'அத்தியாயங்களை ஏற்ற முடியவில்லை.', list: 'பகவத் கீதையின் அத்தியாயங்கள்', verses: 'சுலோகங்கள்', jump: 'அத்தியாயம் அல்லது சுலோகத்திற்குச் செல்லவும்', placeholder: 'எ.கா. 3 அல்லது 3.16' },
};

export default function TextReader() {
  const { language, t } = useLanguage();
  const labels = READER_COPY[language] || READER_COPY.en;
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
          <Link to="/" className="text-reader__back">← {labels.library}</Link>
          <header className="text-reader__header">
            <p className="text-reader__source-badge">{labels.preparation}</p>
            <h1 className="text-reader__title">{meta.title}</h1>
            <p className="text-reader__devanagari devanagari">{meta.devanagari}</p>
            {meta.description && language === 'en' && (
              <p className="text-reader__description">{meta.description}</p>
            )}
          </header>
          <hr className="gold-rule" />
          <div className="text-reader__coming-soon">
            <div className="text-reader__coming-soon-icon" aria-hidden="true">ॐ</div>
            <h2 className="text-reader__coming-soon-title">{labels.soon}</h2>
            <p className="text-reader__coming-soon-body">
              <strong>{meta.title}</strong> {labels.unavailable}
            </p>
            <Link
              to="/bhagavad-gita"
              className="text-reader__coming-soon-cta"
            >
              {t('readGita')} →
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
          ← {labels.library}
        </Link>

        {/* Source header */}
        <header className="text-reader__header">
          <p className="text-reader__source-badge">{t('chapters18')}</p>
          <h1 className="text-reader__title">{language === 'en' ? meta.title : t('heroTitleHighlight')}</h1>
          <p className="text-reader__devanagari devanagari">{meta.devanagari}</p>
          {meta.description && language === 'en' && (
            <p className="text-reader__description">{meta.description}</p>
          )}
        </header>

        {/* Chapter jump */}
        <div className="text-reader__nav-bar">
          <form
            className="text-reader__jump"
            onSubmit={handleJump}
            aria-label={labels.jump}
          >
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={labels.placeholder}
              className="text-reader__jump-input"
              aria-label={labels.jump}
              id="chapter-jump-input"
            />
            <AnimatedButton
              type="submit"
              className="active-press text-reader__jump-btn"
              id="chapter-jump-btn"
            >
              {labels.go}
            </AnimatedButton>
          </form>
        </div>

        <hr className="gold-rule" />

        {/* Loading state */}
        {loading && (
          <LoadingSpinner size="medium" text={labels.loading} />
        )}

        {/* Error state */}
        {!loading && error && (
          <p className="text-reader__error">{labels.failed}</p>
        )}

        {/* ── Chapter list - table-of-contents style ─────────────── */}
        {!loading && !error && chapters.length > 0 && (
          <ol
            className="text-reader__chapter-list"
            aria-label={labels.list}
          >
            {chapters.map((chapter, idx) => (
              <li
                key={chapter.id || chapter.number}
                className="stagger-item text-reader__chapter-item"
                style={{ '--stagger-idx': idx }}
              >
                <Link
                  to={`/chapters/chapter_${chapter.number}`}
                  className="hover-lift text-reader__chapter-row"
                  id={`chapter-link-${chapter.number}`}
                  aria-label={`${t('chapter')} ${chapter.number}`}
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
                    {language === 'en' && <span className="text-reader__chapter-english">
                      {chapter.titleEnglish}
                    </span>}
                    {language === 'en' && chapter.summary && (
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
                        {chapter.verseCount} {labels.verses}
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
          <p className="text-reader__empty">{labels.failed}</p>
        )}

      </div>
    </main>
  );
}

/**
 * Home — "Today's Verse" landing page.
 *
 * The homepage opens directly on today's verse as a full illuminated card.
 * No hero banner with buttons. No marketing copy.
 * "Today's verse" is deterministic: (day_index % total_verse_count).
 *
 * Below the verse: chapter navigation and a brief app description.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllChapters, getVerse } from '../services/api';
import IlluminatedVerseCard from '../components/IlluminatedVerseCard';
import './Home.css';

// Deterministic daily verse: same verse all day, changes at midnight UTC
const getTodaysVerseId = () => {
  const dayIndex = Math.floor(Date.now() / 86400000);
  // Chapter-verse pairs to cycle through (representative selection)
  const verseIds = [
    '2_47', '2_20', '2_19', '2_48', '4_7', '4_8', '9_22',
    '18_66', '18_65', '6_5', '12_13', '3_21', '7_19',
    '2_62', '2_70', '2_11', '5_18', '15_7', '11_32', '3_8',
  ];
  return verseIds[dayIndex % verseIds.length];
};

export default function Home() {
  const [todaysVerse, setTodaysVerse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verseId = getTodaysVerseId();
    Promise.all([
      getVerse(verseId).catch(() => null),
      getAllChapters().catch(() => ({ chapters: [] })),
    ]).then(([verse, chapsData]) => {
      setTodaysVerse(verse);
      setChapters(chapsData.chapters || []);
      setLoading(false);
    });
  }, []);

  return (
    <main className="home">
      {/* Masthead */}
      <header className="home__masthead">
        <div className="home__title-block">
          <span className="home__eyebrow">Bhagavad Gita</span>
          <h1 className="home__title devanagari">ज्ञान सूत्र</h1>
          <p className="home__subtitle">Thread of knowledge from the Bhagavad Gita</p>
        </div>
        <hr className="gold-rule home__rule" />
      </header>

      {/* Today's verse */}
      <section className="home__todays-verse" aria-label="Today's verse">
        <div className="home__section-label">
          <span className="home__date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <span className="home__section-title">Today's Teaching</span>
        </div>

        {loading ? (
          <div className="home__verse-skeleton" aria-hidden="true">
            <div className="home__skeleton-block" style={{ height: '280px' }} />
          </div>
        ) : todaysVerse ? (
          <IlluminatedVerseCard verse={todaysVerse} variant="full" />
        ) : (
          <div className="home__verse-unavailable">
            <p>Today's verse is not yet available. Run the ingestion script to load the scripture.</p>
            <code>cd backend && npm run ingest</code>
          </div>
        )}
      </section>

      {/* Chapter grid — reads like tabbed page-edges */}
      <section className="home__chapters" aria-label="All chapters">
        <hr className="gold-rule" />
        <h2 className="home__chapters-heading">Eighteen Chapters</h2>
        <p className="home__chapters-sub">
          अष्टादश अध्याय — Ashtadasha Adhyaya
        </p>
        <div className="home__chapter-grid">
          {loading
            ? Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="home__chapter-card home__chapter-card--skeleton" aria-hidden="true" />
              ))
            : chapters.map((ch) => (
                <Link
                  key={ch.id}
                  to={`/chapters/${ch.id}`}
                  className="home__chapter-card"
                  id={`chapter-card-${ch.number}`}
                >
                  <span className="home__chapter-num">{toRoman(ch.number)}</span>
                  <span className="home__chapter-title-devanagari devanagari">{ch.titleSanskrit}</span>
                  <span className="home__chapter-title-en">{ch.titleEnglish}</span>
                  <span className="home__chapter-verses">{ch.verseCount} verses</span>
                </Link>
              ))
          }
        </div>
      </section>
    </main>
  );
}

function toRoman(num) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  for (const [val, sym] of map) {
    while (num >= val) { result += sym; num -= val; }
  }
  return result;
}

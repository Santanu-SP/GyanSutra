import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDailyVerse } from '../services/api';

const SOURCES = [
  {
    id: 'bhagavad-gita',
    title: 'Bhagavad Gita',
    devanagari: 'गीता',
    count: '18 chapters',
    description: 'Krishna and Arjuna discuss duty, action, devotion, and self-knowledge.',
  },
  {
    id: 'ramayana',
    title: 'Valmiki Ramayana',
    devanagari: 'राम',
    count: '7 kandas',
    description: 'Read the account of Rama through exile, separation, war, and return.',
  },
];

export default function Home() {
  const [dailyVerse, setDailyVerse] = useState(null);
  const [dailyVerseState, setDailyVerseState] = useState('loading');

  useEffect(() => {
    getDailyVerse()
      .then((res) => {
        if (res.verse) {
          setDailyVerse(res.verse);
          setDailyVerseState('ready');
        } else {
          setDailyVerseState('unavailable');
        }
      })
      .catch(() => setDailyVerseState('unavailable'));
  }, []);

  return (
    <main className="gs-home-page">
      <section className="gs-home">
        <header className="gs-home__hero">
          <div className="gs-home__intro">
            <p className="gs-home__eyebrow">Gyan Sutra Library</p>
            <h1 className="gs-home__heading">
              Read the <span>Bhagavad Gita</span> and Ramayana
            </h1>
            <p className="gs-home__subheading">
              Original Sanskrit with transliteration, English translation, and clear commentary.
            </p>
            <div className="gs-home__cta-row">
              <Link to="/bhagavad-gita" className="gs-home__cta-primary">
                Read the Bhagavad Gita
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#text-library" className="gs-home__text-link">
                Browse the library
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>

          <aside
            className="gs-home__darshan"
            aria-labelledby="daily-verse-title"
          >
            <div className="gs-home__darshan-header">
              <div>
                <p className="gs-home__eyebrow">Daily Darshan</p>
                <h2 id="daily-verse-title">Today’s verse</h2>
              </div>
              <span className="gs-home__darshan-mark" aria-hidden="true">ॐ</span>
            </div>

            {dailyVerseState === 'loading' && (
              <div className="gs-home__darshan-status gs-home__darshan-status--loading" role="status">
                <span className="gs-home__darshan-loader" aria-hidden="true" />
                <span>Preparing today’s verse</span>
              </div>
            )}

            {dailyVerseState === 'unavailable' && (
              <div className="gs-home__darshan-status">
                <p>Today’s verse is not available right now.</p>
                <Link to="/bhagavad-gita">Browse the Gita</Link>
              </div>
            )}

            {dailyVerseState === 'ready' && dailyVerse && (
              <div className="gs-home__darshan-content">
                <p className="gs-home__darshan-sanskrit devanagari">
                  {dailyVerse.sanskrit}
                </p>
                <p className="gs-home__darshan-translation">
                  {dailyVerse.translationEnglish}
                </p>
                <div className="gs-home__darshan-actions">
                  <span>Bhagavad Gita {dailyVerse.chapterNumber}.{dailyVerse.verseNumber}</span>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', {
                      detail: { prompt: `Explain Bhagavad Gita ${dailyVerse.chapterNumber}.${dailyVerse.verseNumber} in simple terms.` },
                    }))}
                  >
                    Explain this verse
                  </button>
                </div>
              </div>
            )}
          </aside>
        </header>

        <section id="text-library" className="gs-home__library" aria-labelledby="library-title">
          <div className="gs-home__section-heading">
            <div>
              <p className="gs-home__eyebrow">Available to read</p>
              <h2 id="library-title">Choose a text</h2>
            </div>
            <p>Open a text, choose a chapter, and continue at your own pace.</p>
          </div>

          <div className="gs-home__cards-grid">
            {SOURCES.map((source) => (
              <Link key={source.id} to={`/${source.id}`} className="gs-home__source-card">
                <div className="gs-home__source-topline">
                  <span>{source.count}</span>
                  <span className="devanagari" aria-hidden="true">{source.devanagari}</span>
                </div>
                <h3>{source.title}</h3>
                <p>{source.description}</p>
                <span className="gs-home__source-action">
                  Read {source.title}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>

          <p className="gs-home__upcoming">
            In preparation: Upanishads, Mahabharata, and Puranas.
          </p>
        </section>
      </section>
    </main>
  );
}

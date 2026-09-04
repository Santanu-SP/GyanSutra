import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDailyVerse } from '../services/api';
import useLanguage from '../i18n/useLanguage';
import useLocalizedVerse, { GENERATED_LANGUAGES } from '../hooks/useLocalizedVerse';

export default function Home() {
  const { language, t } = useLanguage();
  const [dailyVerse, setDailyVerse] = useState(null);
  const [dailyVerseState, setDailyVerseState] = useState('loading');
  const dailyLocalization = useLocalizedVerse(dailyVerse, language);

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

  const sources = [
    { id: 'bhagavad-gita', title: language === 'en' ? 'Bhagavad Gita' : t('heroTitleHighlight'), devanagari: 'गीता', count: t('chapters18'), description: t('gitaDescription') },
    { id: 'ramayana', title: language === 'en' ? 'Valmiki Ramayana' : t('ramayana'), devanagari: 'राम', count: t('kandas7'), description: t('ramayanaDescription') },
  ];
  const dailyMeaning = GENERATED_LANGUAGES.has(language)
    ? (dailyLocalization.content?.translation
      || dailyVerse?.translationEnglish
      || dailyVerse?.translationHindi
      || t('translationUnavailable'))
    : language === 'hi'
      ? (dailyVerse?.translationHindi || dailyVerse?.translationEnglish || t('translationUnavailable'))
      : (dailyVerse?.translationEnglish || dailyVerse?.translationHindi || t('translationUnavailable'));

  return (
    <main className="gs-home-page">
      <section className="gs-home">
        <header className="gs-home__hero">
          <div className="gs-home__intro">
            <p className="gs-home__eyebrow">{t('libraryName')}</p>
            <h1 className="gs-home__heading">
              {t('heroTitleBefore')}<span>{t('heroTitleHighlight')}</span>{t('heroTitleAfter')}
            </h1>
            <p className="gs-home__subheading">
              {t('heroSubtitle')}
            </p>
            <div className="gs-home__cta-row">
              <Link to="/bhagavad-gita" className="gs-home__cta-primary">
                {t('readGita')}
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#text-library" className="gs-home__text-link">
                {t('browseLibrary')}
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
                <p className="gs-home__eyebrow">{t('dailyDarshan')}</p>
                <h2 id="daily-verse-title">{t('todaysVerse')}</h2>
              </div>
              <span className="gs-home__darshan-mark" aria-hidden="true">ॐ</span>
            </div>

            {dailyVerseState === 'loading' && (
              <div className="gs-home__darshan-status gs-home__darshan-status--loading" role="status">
                <span className="sr-only">{t('preparingVerse')}</span>
                <span className="gs-home__darshan-skeleton gs-home__darshan-skeleton--sanskrit" aria-hidden="true" />
                <span className="gs-home__darshan-skeleton gs-home__darshan-skeleton--translation" aria-hidden="true" />
                <span className="gs-home__darshan-skeleton gs-home__darshan-skeleton--action" aria-hidden="true" />
              </div>
            )}

            {dailyVerseState === 'unavailable' && (
              <div className="gs-home__darshan-status">
                <p className="gs-home__darshan-status-title">{t('dailyUnavailable')}</p>
                <p>{t('continueGita')}</p>
                <Link to="/bhagavad-gita">{t('browseGita')} <span aria-hidden="true">→</span></Link>
              </div>
            )}

            {dailyVerseState === 'ready' && dailyVerse && (
              <div className="gs-home__darshan-content">
                <p className="gs-home__darshan-sanskrit devanagari">
                  {dailyVerse.sanskrit}
                </p>
                <div className="gs-home__darshan-meaning">
                  <span>{t('meaning')}</span>
                  <p className="gs-home__darshan-translation">
                    {dailyMeaning}
                  </p>
                </div>
                <div className="gs-home__darshan-actions">
                  <Link
                    to={`/chapters/chapter_${dailyVerse.chapterNumber}?verse=${dailyVerse.verseNumber}`}
                    className="gs-home__darshan-reference"
                    aria-label={`Read Bhagavad Gita ${dailyVerse.chapterNumber}.${dailyVerse.verseNumber}`}
                  >
                    <span className="gs-home__darshan-citation">
                      Bhagavad Gita {dailyVerse.chapterNumber}.{dailyVerse.verseNumber}
                    </span>
                    <span className="gs-home__darshan-read">
                      {t('readFullVerse')} <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-sarathi', {
                      detail: { prompt: `Explain Bhagavad Gita ${dailyVerse.chapterNumber}.${dailyVerse.verseNumber} in simple terms.` },
                    }))}
                  >
                    {t('askSarathi')} <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        </header>

        <section id="text-library" className="gs-home__library" aria-labelledby="library-title">
          <div className="gs-home__section-heading">
            <div>
              <p className="gs-home__eyebrow">{t('availableRead')}</p>
              <h2 id="library-title">{t('chooseText')}</h2>
            </div>
            <p>{t('chooseTextHelp')}</p>
          </div>

          <div className="gs-home__cards-grid">
            {sources.map((source) => (
              <Link key={source.id} to={`/${source.id}`} className="gs-home__source-card">
                <div className="gs-home__source-topline">
                  <span>{source.count}</span>
                  <span className="devanagari" aria-hidden="true">{source.devanagari}</span>
                </div>
                <h3>{source.title}</h3>
                <p>{source.description}</p>
                <span className="gs-home__source-action">
                  {t('read')} {source.title}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>

          <p className="gs-home__upcoming">
            {t('inPreparation')}
          </p>
        </section>
      </section>
    </main>
  );
}

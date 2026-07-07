/**
 * IlluminatedVerseCard — the visual signature of Gyan Sutra.
 *
 * Every verse is shown inside this panel, consistently, across:
 *   - Chapter reader
 *   - Verse detail page
 *   - Search results
 *   - Ask citations
 *   - Recommendations rail
 *
 * Structure:
 *   ┌─────── thin gold hairline border ───────────┐
 *   │  [corner flourish — flame motif, low opacity]│
 *   │                                              │
 *   │  Sanskrit (large, Tiro Devanagari)           │
 *   │  Transliteration (italic, smaller)           │
 *   │  ────────────────────────────────            │
 *   │  [Hindi / English toggle]                    │
 *   │  Translation text                            │
 *   │                                              │
 *   │  Chapter X · Verse Y    [tags...]            │
 *   └──────────────────────────────────────────────┘
 *
 * Props:
 *   verse       {object}  — verse document from Firestore/API
 *   variant     {'full' | 'compact' | 'citation'}  — layout variant
 *   onClick     {function} — optional click handler (for search/citations)
 *   similarity  {number}  — optional similarity score (for citation display)
 *   className   {string}  — additional class names
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './IlluminatedVerseCard.css';

// SVG corner flourish — flame and thread motif at low opacity
const CornerFlourish = ({ position = 'top-right', size = 48 }) => (
  <svg
    className={`verse-card__flourish verse-card__flourish--${position}`}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
  >
    {/* Flame shape */}
    <path
      d="M24 42C24 42 10 30 10 20C10 13.373 16.268 8 24 8C31.732 8 38 13.373 38 20C38 30 24 42 24 42Z"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M24 36C24 36 15 27 15 21C15 17.134 19.134 14 24 14C28.866 14 33 17.134 33 21C33 27 24 36 24 36Z"
      fill="currentColor"
      opacity="0.5"
    />
    {/* Thread lines */}
    <line x1="0" y1="48" x2="48" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
    <line x1="8" y1="48" x2="48" y2="8" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
    <line x1="0" y1="40" x2="40" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
  </svg>
);

export default function IlluminatedVerseCard({
  verse,
  variant = 'full',
  onClick,
  similarity,
  className = '',
}) {
  const [lang, setLang] = useState('english'); // 'english' | 'hindi'
  const navigate = useNavigate();

  if (!verse) return null;

  const {
    id,
    chapterNumber,
    verseNumber,
    sanskrit,
    transliteration,
    translationEnglish,
    translationHindi,
    wordMeanings = [],
    tags = [],
  } = verse;

  const isClickable = !!onClick || variant === 'compact' || variant === 'citation';

  const handleClick = () => {
    if (onClick) {
      onClick(verse);
    } else if (id) {
      navigate(`/verses/${id}`);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className={`verse-card verse-card--${variant} ${isClickable ? 'verse-card--clickable' : ''} ${className}`}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : 'article'}
      aria-label={`Chapter ${chapterNumber}, Verse ${verseNumber}`}
      id={`verse-${id || `${chapterNumber}-${verseNumber}`}`}
    >
      {/* Corner flourishes — the recurring motif */}
      <CornerFlourish position="top-right" size={variant === 'compact' ? 32 : 48} />
      <CornerFlourish position="bottom-left" size={variant === 'compact' ? 32 : 48} />

      {/* Verse reference badge */}
      <div className="verse-card__ref">
        <span className="verse-card__ref-label">
          Chapter {chapterNumber} · Verse {verseNumber}
        </span>
        {similarity !== undefined && (
          <span className="verse-card__similarity" title="Relevance score">
            {Math.round(similarity * 100)}% match
          </span>
        )}
      </div>

      {/* Sanskrit — always the visual leader */}
      {sanskrit && (
        <div className="verse-card__sanskrit devanagari-hero">
          {sanskrit}
        </div>
      )}

      {/* Transliteration */}
      {transliteration && variant !== 'compact' && (
        <div className="verse-card__transliteration">
          {transliteration}
        </div>
      )}

      {/* Gold hairline divider */}
      <hr className="verse-card__rule gold-rule" />

      {/* Language toggle — not two parallel columns */}
      <div className="verse-card__translation-area">
        {translationHindi && translationEnglish && (
          <div className="verse-card__lang-toggle" role="group" aria-label="Translation language">
            <button
              className={`verse-card__lang-btn ${lang === 'english' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setLang('english'); }}
              aria-pressed={lang === 'english'}
              id={`lang-toggle-en-${id}`}
            >
              English
            </button>
            <button
              className={`verse-card__lang-btn ${lang === 'hindi' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setLang('hindi'); }}
              aria-pressed={lang === 'hindi'}
              id={`lang-toggle-hi-${id}`}
            >
              हिन्दी
            </button>
          </div>
        )}

        <p className={`verse-card__translation ${lang === 'hindi' ? 'devanagari' : ''}`}>
          {lang === 'hindi' ? translationHindi : translationEnglish}
        </p>
      </div>

      {/* Word meanings — only on full variant */}
      {variant === 'full' && wordMeanings.length > 0 && (
        <details className="verse-card__word-meanings">
          <summary>Word meanings</summary>
          <dl className="verse-card__word-list">
            {wordMeanings.map((wm, i) => (
              <div key={i} className="verse-card__word-item">
                <dt className="devanagari">{wm.word}</dt>
                <dd>{wm.meaning}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="verse-card__tags">
          {tags.slice(0, variant === 'compact' ? 2 : 5).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}

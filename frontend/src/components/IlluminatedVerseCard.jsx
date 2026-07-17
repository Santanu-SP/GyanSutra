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
    explanationEnglish,
    explanationHindi,
    sourceCommentary,
    detailedExplanations = [],
    wordMeanings = [],
    tags = [],
    comments,
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

      <div className="verse-card__content-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
        
        {/* 1. SIMPLE MEANING */}
        <section className="verse-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="section-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber-500)', opacity: 0.9 }}>
              {lang === 'hindi' ? 'सरल अर्थ' : 'Simple Meaning'}
            </h3>
            {(translationHindi || (verse.book === 'ramayana' ? explanationEnglish : translationEnglish)) && (
              <div className="verse-card__lang-toggle" role="group" aria-label="Translation language" style={{ margin: 0 }}>
                <button
                  className={`verse-card__lang-btn ${lang === 'english' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setLang('english'); }}
                >
                  English
                </button>
                <button
                  className={`verse-card__lang-btn ${lang === 'hindi' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setLang('hindi'); }}
                >
                  हिन्दी
                </button>
              </div>
            )}
          </div>
          <p className={`verse-card__translation ${lang === 'hindi' ? 'devanagari' : ''}`} style={{ fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 500 }}>
            {lang === 'hindi' 
              ? (translationHindi || "हिन्दी अनुवाद उपलब्ध नहीं है।") 
              : (verse.book === 'ramayana' ? explanationEnglish : translationEnglish)}
          </p>
        </section>

        {/* 2. AUTHENTIC COMMENTARY */}
        {variant === 'full' && (detailedExplanations.length > 0 || sourceCommentary || comments || (verse.book !== 'ramayana' && (explanationEnglish || explanationHindi))) && (
          <section className="verse-section">
            <h3 className="section-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber-500)', opacity: 0.9, marginBottom: '1rem' }}>
              {lang === 'hindi' ? 'प्रमाणिक व्याख्या' : 'Authentic Commentary'}
            </h3>
            
            <div className="commentary-list">
              {detailedExplanations.length > 0 ? (
                detailedExplanations.map((exp, idx) => (
                  <div key={idx} className="commentary-item" style={{ marginBottom: '2rem' }}>
                    <h4 className="commentary-author" style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--amber-500)', opacity: 0.5 }}></span>
                      {exp.author}
                    </h4>
                    <p className={`commentary-text ${exp.language === 'hindi' ? 'devanagari' : ''}`} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {exp.explanation}
                    </p>
                  </div>
                ))
              ) : verse.book === 'ramayana' && comments ? (
                <div className="commentary-item" style={{ marginBottom: '2rem' }}>
                  <h4 className="commentary-author" style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--amber-500)', opacity: 0.5 }}></span>
                    Valmiki Ramayana Commentary
                  </h4>
                  <p className="commentary-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {comments}
                  </p>
                </div>
              ) : (explanationEnglish || explanationHindi) ? (
                <div className="commentary-item" style={{ marginBottom: '2rem' }}>
                  <h4 className="commentary-author" style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--amber-500)', opacity: 0.5 }}></span>
                    Detailed Translation & Explanation
                  </h4>
                  <p className={`commentary-text ${lang === 'hindi' ? 'devanagari' : ''}`} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {lang === 'hindi' ? (explanationHindi || explanationEnglish) : (explanationEnglish || explanationHindi)}
                  </p>
                </div>
              ) : (
                <p className={`commentary-text ${lang === 'hindi' ? 'devanagari' : ''}`} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {sourceCommentary}
                </p>
              )}
            </div>
          </section>
        )}

        {/* 3. KEY TEACHINGS (Word Meanings) */}
        {variant === 'full' && (wordMeanings.length > 0 || (verse.book === 'ramayana' && translationEnglish)) && (
          <details className="verse-card__word-meanings" style={{ borderTop: '1px solid var(--hairline)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <summary style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
              {lang === 'hindi' ? 'मुख्य शब्दार्थ' : 'Key Vocabulary'}
            </summary>
            {verse.book === 'ramayana' ? (
              <p style={{ marginTop: '1rem', lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '1rem' }}>
                {translationEnglish}
              </p>
            ) : (
              <ul style={{ marginTop: '1rem', listStyleType: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
                {wordMeanings.map((wm, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--amber-500)', fontSize: '0.8rem' }}>❖</span>
                    <span className="devanagari" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{wm.word}</span>
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{wm.meaning}</span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}

        {/* 4 & 5. PRACTICAL LIFE LESSON & REFLECTION (AI On-Demand) */}
        {variant === 'full' && (
          <section className="verse-section" style={{ borderTop: '1px solid var(--hairline)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem', maxWidth: '400px' }}>
              {lang === 'hindi' 
                ? 'इस श्लोक को अपने आधुनिक जीवन में कैसे उतारें? सारथी से गहन मनन और जीवन-सूत्र प्राप्त करें।'
                : 'How does this verse apply to modern life? Ask Saarthi for practical life lessons and personal reflections.'}
            </p>
              <button
              onClick={(e) => {
                e.stopPropagation();
                const saarthiPrompt = verse.book === 'ramayana'
                  ? `What are the practical life lessons and reflection questions for ${verse.kanda || 'Kanda ' + verse.kandaNumber} Sarga ${verse.sarga} Shloka ${verse.shlokaNumber}?`
                  : `What are the practical life lessons and reflection questions for Chapter ${chapterNumber} Verse ${verseNumber}?`;
                  
                window.dispatchEvent(new CustomEvent('open-saarthi', { 
                  detail: { prompt: saarthiPrompt } 
                }));
              }}
              className="inline-flex items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-amber-400/60 hover:text-[color:var(--amber-500)]"
              style={{ gap: '0.5rem', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
              </svg>
              {lang === 'hindi' ? 'सारथी के साथ मनन करें' : 'Reflect with Saarthi'}
            </button>
          </section>
        )}

      </div>

      {/* Tags */}
      {tags.length > 0 && variant === 'full' && (
        <div className="verse-card__tags">
          {tags.slice(0, variant === 'compact' ? 2 : 5).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
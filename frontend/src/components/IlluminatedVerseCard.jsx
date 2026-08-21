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

// Helper component to format long commentary texts into readable paragraphs
// and separate word meanings from the actual commentary in English texts.
const FormattedCommentary = ({ text, language, className = '', style = {} }) => {
  if (!text) return null;
  
  let formattedText = text.trim();
  const isEnglish = language === 'english' || (!language && /[a-z]/i.test(formattedText));
  
  const splitIntoParagraphs = (str, isHindi) => {
    const sentenceRegex = isHindi ? /([^।!?]+[।!?]+)/g : /([^.!?]+[.!?]+)/g;
    let sentences = str.match(sentenceRegex);
    
    if (!sentences || sentences.length === 0) {
      sentences = [str];
    } else {
      const matchedLength = sentences.join('').length;
      if (matchedLength < str.length) {
        sentences.push(str.substring(matchedLength));
      }
    }

    const paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      let pText = sentences.slice(i, i + 3).join(' ').trim();
      if (isHindi) {
        pText = pText.replace(/(\S)\?\s+(?=[^\s])/g, '$1, ');
      }
      if (pText) paragraphs.push(pText);
    }
    return paragraphs;
  };

  const baseStyle = { lineHeight: 1.8, fontSize: '0.975rem', color: 'var(--text-primary)', ...style };

  if (isEnglish) {
    const match = formattedText.match(/^(.*?)(?:\.\s*|\s+)Commentary[:\s]+(.*)$/is);
    
    if (match && match[1].length > 10 && match[2].length > 10) {
      let wordMeaning = match[1].trim();
      let commentary = match[2].trim();
      
      wordMeaning = wordMeaning.replace(/\?/g, ',');
      const paragraphs = splitIntoParagraphs(commentary, false);
      
      return (
        <div className={`formatted-commentary ${className}`} style={baseStyle}>
          <div className="word-meaning-block" style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(201, 154, 78, 0.05)',
            border: '1px solid rgba(201, 154, 78, 0.15)',
            borderRadius: '8px',
            borderLeft: '3px solid var(--amber-500)',
            lineHeight: 1.6,
            whiteSpace: 'normal'
          }}>
            <span style={{fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'var(--amber-500)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem'}}>
              Word Meaning
            </span>
            <span style={{ fontStyle: 'italic' }}>{wordMeaning}</span>
          </div>
          <div className="commentary-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', whiteSpace: 'normal' }}>
            {paragraphs.map((p, idx) => (
              <p key={idx} style={{ margin: 0 }}>{p}</p>
            ))}
          </div>
        </div>
      );
    } else {
      const paragraphs = splitIntoParagraphs(formattedText, false);
      return (
        <div className={`formatted-commentary ${className}`} style={{...baseStyle, display: 'flex', flexDirection: 'column', gap: '1.25rem', whiteSpace: 'normal'}}>
          {paragraphs.map((p, idx) => (
            <p key={idx} style={{ margin: 0 }}>{p}</p>
          ))}
        </div>
      );
    }
  } else {
    formattedText = formattedText.replace(/।([^\s\n])/g, '। $1');
    const paragraphs = splitIntoParagraphs(formattedText, true);
    
    return (
      <div className={`formatted-commentary devanagari ${className}`} style={{...baseStyle, display: 'flex', flexDirection: 'column', gap: '1.25rem', whiteSpace: 'normal'}}>
        {paragraphs.map((p, idx) => (
          <p key={idx} style={{ margin: 0 }}>{p}</p>
        ))}
      </div>
    );
  }
};

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
          {verse.book === 'ramayana' || verse.kanda
            ? `${verse.kanda || 'Kanda ' + verse.kandaNumber} · Sarga ${verse.sarga} · Shloka ${verse.shlokaNumber}`
            : `Chapter ${chapterNumber} · Verse ${verseNumber}`}
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

      {/* Tra      <div className="verse-card__content-grid" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
        
        {/* LANGUAGE TOGGLE HEADER */}
        {(translationHindi || (verse.book === 'ramayana' ? explanationEnglish : translationEnglish)) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
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
          </div>
        )}

        {/* 1. KEY VOCABULARY (Word Meanings) */}
        {variant === 'full' && (wordMeanings.length > 0 || (verse.book === 'ramayana' && translationEnglish)) && (
          <section className="verse-section">
            <h3 className="section-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber-500)', opacity: 0.9, marginBottom: '1rem' }}>
              {lang === 'hindi' ? 'मुख्य शब्दार्थ' : 'Key Vocabulary'}
            </h3>
            {verse.book === 'ramayana' ? (
              <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', fontSize: '1rem' }}>
                {translationEnglish}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem' }}>
                {wordMeanings.map((wm, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="devanagari" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{wm.word}</span>
                    <span style={{ color: 'var(--amber-500)', opacity: 0.7 }}>=</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{wm.meaning}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        
        {/* 2. SIMPLE MEANING */}
        <section className="verse-section" style={{ borderTop: variant === 'full' && (wordMeanings.length > 0 || (verse.book === 'ramayana' && translationEnglish)) ? '1px solid var(--hairline)' : 'none', paddingTop: variant === 'full' && (wordMeanings.length > 0 || (verse.book === 'ramayana' && translationEnglish)) ? '1.5rem' : '0' }}>
          <h3 className="section-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber-500)', opacity: 0.9, marginBottom: '1rem' }}>
            {lang === 'hindi' ? 'सरल अर्थ' : 'Simple Meaning'}
          </h3>
          <p className={`verse-card__translation ${lang === 'hindi' ? 'devanagari' : ''}`} style={{ fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 500 }}>
            {lang === 'hindi' 
              ? (translationHindi || "हिन्दी अनुवाद उपलब्ध नहीं है।") 
              : (verse.book === 'ramayana' ? explanationEnglish : translationEnglish)}
          </p>
        </section>

        {/* 3. AUTHENTIC COMMENTARY & GURU EXPLANATIONS */}
        {variant === 'full' && (detailedExplanations.length > 0 || sourceCommentary || comments || (verse.book !== 'ramayana' && (explanationEnglish || explanationHindi))) && (
          <section className="verse-section" style={{ borderTop: '1px solid var(--hairline)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <h3 className="section-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--amber-500)', opacity: 0.9, margin: 0 }}>
                {lang === 'hindi' ? 'प्रमाणिक गुरु व्याख्याएँ (Commentaries)' : 'Authentic Guru Commentaries'}
              </h3>
              {detailedExplanations.length > 1 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  {detailedExplanations.length} Acharyas & Gurus
                </span>
              )}
            </div>
            
            <div className="commentary-list">
              {detailedExplanations.length > 0 ? (
                detailedExplanations.map((exp, idx) => (
                  <div 
                    key={idx} 
                    className="commentary-item" 
                    style={{ 
                      marginBottom: '1.75rem',
                      padding: '1.25rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(217, 119, 6, 0.03)',
                      border: '1px solid rgba(217, 119, 6, 0.12)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h4 className="commentary-author" style={{ 
                        color: 'var(--amber-500)', 
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--amber-500)' }}></span>
                        {exp.author}
                      </h4>
                      {exp.language && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.1em',
                          color: 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--hairline)'
                        }}>
                          {exp.language}
                        </span>
                      )}
                    </div>
                    <FormattedCommentary 
                      text={exp.explanation} 
                      language={exp.language} 
                      className="commentary-text"
                      style={{ margin: 0 }}
                    />
                  </div>
                ))
              ) : verse.book === 'ramayana' && comments ? (
                <div className="commentary-item" style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: '8px', backgroundColor: 'rgba(217, 119, 6, 0.03)', border: '1px solid rgba(217, 119, 6, 0.12)' }}>
                  <h4 className="commentary-author" style={{ 
                    color: 'var(--amber-500)', 
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--amber-500)' }}></span>
                    Valmiki Ramayana Commentary
                  </h4>
                  <FormattedCommentary 
                    text={comments} 
                    language="english" 
                    className="commentary-text"
                    style={{ margin: 0 }}
                  />
                </div>
              ) : (explanationEnglish || explanationHindi) ? (
                <div className="commentary-item" style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: '8px', backgroundColor: 'rgba(217, 119, 6, 0.03)', border: '1px solid rgba(217, 119, 6, 0.12)' }}>
                  <h4 className="commentary-author" style={{ 
                    color: 'var(--amber-500)', 
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--amber-500)' }}></span>
                    Detailed Translation & Explanation
                  </h4>
                  <FormattedCommentary 
                    text={lang === 'hindi' ? (explanationHindi || explanationEnglish) : (explanationEnglish || explanationHindi)} 
                    language={lang} 
                    className="commentary-text"
                    style={{ margin: 0 }}
                  />
                </div>
              ) : (
                <FormattedCommentary 
                  text={sourceCommentary} 
                  language={lang} 
                  className="commentary-text"
                  style={{ margin: 0 }}
                />
              )}
            </div>
          </section>
        )}

        {/* 4 & 5. PRACTICAL LIFE LESSON & REFLECTION (AI On-Demand) */}
        {variant === 'full' && (
          <section className="verse-section" style={{ borderTop: '1px solid var(--hairline)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem', maxWidth: '400px' }}>
              {lang === 'hindi' 
                ? 'इस श्लोक को अपने आधुनिक जीवन में कैसे उतारें? सारथि से गहन मनन और जीवन-सूत्र प्राप्त करें।'
                : 'How does this verse apply to modern life? Ask Sarathi for practical life lessons and personal reflections.'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const sarathiPrompt = verse.book === 'ramayana'
                  ? `What are the practical life lessons and reflection questions for ${verse.kanda || 'Kanda ' + verse.kandaNumber} Sarga ${verse.sarga} Shloka ${verse.shlokaNumber}?`
                  : `What are the practical life lessons and reflection questions for Chapter ${chapterNumber} Verse ${verseNumber}?`;
                  
                window.dispatchEvent(new CustomEvent('open-sarathi', { 
                  detail: { prompt: sarathiPrompt } 
                }));
              }}
              className="inline-flex items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-amber-400/60 hover:text-[color:var(--amber-500)]"
              style={{ gap: '0.5rem', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
              </svg>
              {lang === 'hindi' ? 'सारथि के साथ मनन करें' : 'Reflect with Sarathi'}
            </button>
          </section>
        )}



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
/**
 * IlluminatedVerseCard - the visual signature of Gyan Sutra.
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
 *   │  [corner flourish - flame motif, low opacity]│
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
 *   verse       {object}  - verse document from Firestore/API
 *   variant     {'full' | 'compact' | 'citation'}  - layout variant
 *   onClick     {function} - optional click handler (for search/citations)
 *   similarity  {number}  - optional similarity score (for citation display)
 *   className   {string}  - additional class names
 */

import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import useLanguage from '../i18n/useLanguage';

import './IlluminatedVerseCard.css';

const READING_COPY = {
  en: {
    transliteration: 'Transliteration',
    translation: 'Translation',
    translatedBy: 'Translated by',
    compareTranslations: 'Compare translations',
    wordMeaning: 'Word-by-word meaning',
    explanation: 'Explanation',
    narrativeContext: 'Narrative context',
    commentaries: 'Traditional commentaries',
    sources: 'Text and source notes',
    sourceSeparation: 'Original text, translation, explanation, and commentary are presented separately.',
    sourceCompiled: 'Named translations and commentaries retain their source attribution; this compiled digital record has not yet received independent critical-edition review.',
    editorialPending: 'This record still requires independent editorial verification.',
    matchedPending: 'The Sanskrit and English records were source-matched; independent editorial verification is still pending.',
  },
  hi: {
    transliteration: 'लिप्यंतरण',
    translation: 'अनुवाद',
    translatedBy: 'अनुवादक',
    compareTranslations: 'अन्य अनुवाद देखें',
    wordMeaning: 'शब्दार्थ',
    explanation: 'सरल व्याख्या',
    narrativeContext: 'प्रसंग',
    commentaries: 'परंपरागत टीकाएँ',
    sources: 'पाठ और स्रोत',
    sourceSeparation: 'मूल पाठ, अनुवाद, व्याख्या और टीका को अलग-अलग प्रस्तुत किया गया है।',
    sourceCompiled: 'नामित अनुवादों और टीकाओं के स्रोत सुरक्षित रखे गए हैं; इस संकलित डिजिटल पाठ की स्वतंत्र समालोचनात्मक-संस्करण समीक्षा अभी शेष है।',
    editorialPending: 'इस प्रविष्टि का स्वतंत्र संपादकीय सत्यापन अभी शेष है।',
    matchedPending: 'संस्कृत और अंग्रेज़ी पाठ का स्रोत-मिलान हुआ है; स्वतंत्र संपादकीय सत्यापन अभी शेष है।',
  },
};

function stripReferencePrefix(text) {
  return String(text || '')
    .replace(/^\s*[।|]{0,2}\s*\d+\.\d+\.?\s*[।|]{0,2}\s*/u, '')
    .trim();
}

function cleanWordMeanings(items) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  return items.flatMap((item) => {
    const raw = `${item?.word || ''} ${item?.meaning || ''}`
      .replace(/^English Commentary By [^\d]+/i, '')
      .replace(/^\s*\d+\.\d+\.?\s*/u, '')
      .split(/\.?\s*Commentary\b/i)[0]
      .trim();
    const match = raw.match(/^([\u0900-\u097F]+)\s+(.+)$/u);
    if (!match) return [];

    const word = match[1].trim();
    const meaning = match[2].trim().replace(/[.,;:]$/, '');
    const key = `${word}:${meaning}`;
    if (!meaning || seen.has(key)) return [];
    seen.add(key);
    return [{ word, meaning }];
  });
}

function isSubstantiveText(text) {
  const value = String(text || '').trim();
  return value.length > 20 && !/did not comment on this (?:sloka|verse)/i.test(value);
}

// Format long source commentary into readable paragraphs. Some legacy source
// records prepend vocabulary before a "Commentary" marker; the vocabulary is
// deliberately removed here because it has its own, earlier reading section.
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
    if (match && match[2].length > 10) formattedText = match[2].trim();

    const paragraphs = splitIntoParagraphs(formattedText, false);
    return (
      <div className={`formatted-commentary ${className}`} style={{...baseStyle, display: 'flex', flexDirection: 'column', gap: '1.25rem', whiteSpace: 'normal'}}>
        {paragraphs.map((p, idx) => (
          <p key={idx} style={{ margin: 0 }}>{p}</p>
        ))}
      </div>
    );
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

// SVG corner flourish - flame and thread motif at low opacity
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
  const { language, t } = useLanguage();
  const lang = language === 'hi' ? 'hindi' : 'english';
  const labels = READING_COPY[language] || READING_COPY.en;
  const canShowStoredProse = language === 'en' || language === 'hi';
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
    translationSources,
    additionalTranslations = [],
    explanationEnglish,
    explanationHindi,
    sourceCommentary,
    detailedExplanations = [],
    wordMeanings = [],
    tags = [],
    comments,
    source,
    sourceText,
    verificationStatus,
  } = verse;

  const isClickable = !!onClick || variant === 'compact' || variant === 'citation';
  const isFull = variant === 'full';
  const isRamayana = verse.book === 'ramayana' || Boolean(verse.kanda);
  const vocabulary = cleanWordMeanings(wordMeanings);
  const translationText = canShowStoredProse
    ? stripReferencePrefix(lang === 'hindi' ? translationHindi : translationEnglish)
    : '';
  const explanationText = canShowStoredProse
    ? stripReferencePrefix(lang === 'hindi' ? explanationHindi : explanationEnglish)
    : '';
  const preferredCommentaryLanguage = lang;
  const commentaries = detailedExplanations
    .filter((item) => isSubstantiveText(item?.explanation))
    .sort((a, b) => {
      const rank = (item) => item.language === preferredCommentaryLanguage
        ? 0
        : item.language === 'sanskrit' ? 1 : 2;
      return rank(a) - rank(b);
    });
  const alternateTranslations = additionalTranslations.filter((item) => (
    item?.language === lang
    && isSubstantiveText(item?.translation)
    && stripReferencePrefix(item.translation) !== translationText
  ));
  const primaryTranslator = translationSources?.[lang]?.author
    || (!isRamayana && lang === 'english' ? 'Swami Sivananda' : null)
    || (!isRamayana && lang === 'hindi' ? 'Swami Tejomayananda' : null)
    || (isRamayana && source?.includes('rahular/itihasa') && lang === 'english'
      ? 'M. N. Dutt'
      : null);
  const hasExplanation = explanationText && explanationText !== translationText;
  const hasCommentary = commentaries.length > 0 || isSubstantiveText(sourceCommentary);
  const displayedCommentaries = commentaries.length > 0
    ? commentaries
    : hasCommentary
      ? [{ author: labels.commentaries, language: lang, explanation: sourceCommentary }]
      : [];
  const sourceDescription = isRamayana
    ? (source?.includes('rahular/itihasa')
      ? 'Sanskrit: Valmiki Ramayana Dataset · English translation: M. N. Dutt via the Itihāsa corpus'
      : 'Sanskrit and supporting text: Valmiki Ramayana Dataset')
    : (sourceText || 'Bhagavad Gita');

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
      aria-label={`${t('chapter')} ${chapterNumber}, ${t('verse')} ${verseNumber}`}
      id={`verse-${id || `${chapterNumber}-${verseNumber}`}`}
    >
      {/* Corner flourishes - the recurring motif */}
      <CornerFlourish position="top-right" size={variant === 'compact' ? 32 : 48} />
      <CornerFlourish position="bottom-left" size={variant === 'compact' ? 32 : 48} />

      {/* Verse reference badge */}
      <div className="verse-card__ref">
        <span className="verse-card__ref-label">
          {verse.book === 'ramayana' || verse.kanda
            ? `${verse.kanda || `${t('kanda')} ${verse.kandaNumber}`} · ${t('sarga')} ${verse.sarga} · ${t('shloka')} ${verse.shlokaNumber}`
            : `${t('chapter')} ${chapterNumber} · ${t('verse')} ${verseNumber}`}
        </span>
        {similarity !== undefined && (
          <span className="verse-card__similarity" title="Relevance score">
            {Math.round(similarity * 100)}% {t('relevance')}
          </span>
        )}
      </div>

      {/* Sanskrit - always the visual leader */}
      {sanskrit && (
        <div className="verse-card__sanskrit devanagari-hero">
          {sanskrit}
        </div>
      )}

      {isFull && transliteration && (
        <section className="verse-card__section verse-card__transliteration-section">
          <h3 className="verse-card__section-title">{labels.transliteration}</h3>
          <p className="verse-card__transliteration">{transliteration}</p>
        </section>
      )}

      <div className="verse-card__content-grid">
        {/* Read: a direct translation follows the original text. */}
        <section className="verse-card__section verse-card__translation-area">
          <div className="verse-card__section-heading">
            <h3 className="verse-card__section-title">{labels.translation}</h3>
            {canShowStoredProse && primaryTranslator && (
              <span className="verse-card__attribution">
                {labels.translatedBy} {primaryTranslator}
              </span>
            )}
          </div>
          <p className={`verse-card__translation ${lang === 'hindi' ? 'devanagari' : ''}`}>
            {translationText || t('translationUnavailable')}
          </p>

          {isFull && alternateTranslations.length > 0 && (
            <details className="verse-card__disclosure verse-card__alternate-translations">
              <summary>{labels.compareTranslations} ({alternateTranslations.length})</summary>
              <div className="verse-card__alternate-list">
                {alternateTranslations.map((item, index) => (
                  <article className="verse-card__alternate" key={`${item.author}-${index}`}>
                    <h4>{item.author || labels.translation}</h4>
                    <p className={lang === 'hindi' ? 'devanagari' : ''}>
                      {stripReferencePrefix(item.translation)}
                    </p>
                  </article>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Understand: supporting lexical and explanatory material. */}
        {isFull && canShowStoredProse && vocabulary.length > 0 && (
          <details className="verse-card__disclosure verse-card__word-meanings" open>
            <summary>{labels.wordMeaning}</summary>
            <dl className="verse-card__word-list">
              {vocabulary.map((item, index) => (
                <div className="verse-card__word-item" key={`${item.word}-${index}`}>
                  <dt className="devanagari">{item.word}</dt>
                  <dd>{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {isFull && hasExplanation && (
          <section className="verse-card__section">
            <h3 className="verse-card__section-title">{labels.explanation}</h3>
            <p className={`verse-card__explanation ${lang === 'hindi' ? 'devanagari' : ''}`}>
              {explanationText}
            </p>
          </section>
        )}

        {isFull && canShowStoredProse && isSubstantiveText(comments) && (
          <section className="verse-card__section verse-card__context">
            <h3 className="verse-card__section-title">{labels.narrativeContext}</h3>
            <FormattedCommentary text={comments} language="english" />
          </section>
        )}

        {/* Study deeply: source-attributed interpretations stay optional. */}
        {isFull && canShowStoredProse && displayedCommentaries.length > 0 && (
          <details className="verse-card__disclosure verse-card__commentaries">
            <summary>
              {labels.commentaries}
              <span>{displayedCommentaries.length} {t('sourceCount')}</span>
            </summary>
            <div className="verse-card__commentary-list">
              {displayedCommentaries.map((item, index) => (
                <details
                  className="verse-card__commentary-source"
                  key={`${item.author}-${index}`}
                  open={index === 0}
                >
                  <summary>
                    <span>{item.author || labels.commentaries}</span>
                    {item.language && <small>{item.language}</small>}
                  </summary>
                  <FormattedCommentary
                    text={item.explanation}
                    language={item.language}
                    className="commentary-text"
                  />
                </details>
              ))}
            </div>
          </details>
        )}

        {isFull && (
          <details className="verse-card__disclosure verse-card__source-notes">
            <summary>{labels.sources}</summary>
            <div className="verse-card__source-note-body">
              <p>{sourceDescription}</p>
              <p>{labels.sourceSeparation}</p>
              {isRamayana && (
                <p className="verse-card__verification-note">
                  {verificationStatus === 'source-matched' || source?.includes('rahular/itihasa')
                    ? labels.matchedPending
                    : labels.editorialPending}
                </p>
              )}
              {!isRamayana && (
                <p className="verse-card__verification-note">{labels.sourceCompiled}</p>
              )}
            </div>
          </details>
        )}

        {/* Ask only after the user has read the sourced material. */}
        {isFull && (
          <section className="verse-card__ask">
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem', maxWidth: '400px' }}>
              {t('askVerseHelp')}
            </p>
            <AnimatedButton
              onClick={(e) => {
                e.stopPropagation();
                const sarathiPrompt = verse.book === 'ramayana'
                  ? `Explain ${verse.kanda || 'Kanda ' + verse.kandaNumber}, Sarga ${verse.sarga}, Shloka ${verse.shlokaNumber} in simple terms.`
                  : `Explain Bhagavad Gita ${chapterNumber}.${verseNumber} in simple terms.`;
                  
                window.dispatchEvent(new CustomEvent('open-sarathi', { 
                  detail: { prompt: sarathiPrompt } 
                }));
              }}
              className="inline-flex items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:border-amber-400/60 hover:text-[color:var(--accent)]"
              style={{ gap: '0.5rem', cursor: 'pointer' }}
            >
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16" opacity="0.8">
                <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="currentColor" opacity="0.85"/>
              </svg>
              {t('askAboutVerse')}
            </AnimatedButton>
          </section>
        )}
      </div>

      {/* Tags */}
      {canShowStoredProse && tags.length > 0 && variant === 'full' && (
        <div className="verse-card__tags">
          {tags.slice(0, variant === 'compact' ? 2 : 5).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}

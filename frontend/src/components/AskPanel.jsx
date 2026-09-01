/**
 * AskPanel - the AI Q&A interface.
 *
 * Loading state: diya flicker (opacity pulse, disabled if prefers-reduced-motion).
 * Refusal state: calm, intentional - looks deliberate, not like an error.
 * Answer state: response text + IlluminatedVerseCard citations, tappable.
 */

import { useState, useRef } from 'react';
import { askQuestion } from '../services/api';
import IlluminatedVerseCard from './IlluminatedVerseCard';
import AnimatedButton from './AnimatedButton';
import useLanguage from '../i18n/useLanguage';

import './AskPanel.css';

const ASK_COPY = {
  en: { label: 'Ask a question about the Gita', placeholder: 'Ask about the Bhagavad Gita\nFor example: What does Krishna say about duty?', looking: 'Looking through the verses…', answer: 'Answer from the text', cited: 'Cited Verses', another: 'Ask another question', hint: 'Try exploring the chapters directly, or rephrase your question.', different: 'Try a different question', error: 'Something went wrong. Please try again.', retry: 'Try again' },
  hi: { label: 'गीता के बारे में प्रश्न पूछें', placeholder: 'भगवद्गीता के बारे में पूछें\nउदाहरण: कृष्ण कर्तव्य के बारे में क्या कहते हैं?', looking: 'श्लोकों में खोज रहा हूँ…', answer: 'ग्रंथ से उत्तर', cited: 'उद्धृत श्लोक', another: 'दूसरा प्रश्न पूछें', hint: 'सीधे अध्याय पढ़ें या प्रश्न को दूसरे ढंग से पूछें।', different: 'अलग प्रश्न पूछें', error: 'कुछ गलत हुआ। कृपया फिर प्रयास करें।', retry: 'फिर प्रयास करें' },
  bn: { label: 'গীতা সম্পর্কে প্রশ্ন করুন', placeholder: 'ভগবদ্গীতা সম্পর্কে জিজ্ঞাসা করুন\nউদাহরণ: কর্তব্য সম্পর্কে কৃষ্ণ কী বলেন?', looking: 'শ্লোকগুলিতে খুঁজছি…', answer: 'গ্রন্থ থেকে উত্তর', cited: 'উদ্ধৃত শ্লোক', another: 'আরেকটি প্রশ্ন করুন', hint: 'সরাসরি অধ্যায়গুলি পড়ুন বা প্রশ্নটি অন্যভাবে করুন।', different: 'অন্য প্রশ্ন করুন', error: 'কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।', retry: 'আবার চেষ্টা করুন' },
  mr: { label: 'गीतेबद्दल प्रश्न विचारा', placeholder: 'भगवद्गीतेबद्दल विचारा\nउदाहरण: कृष्ण कर्तव्याबद्दल काय सांगतात?', looking: 'श्लोकांमध्ये शोधत आहे…', answer: 'ग्रंथातील उत्तर', cited: 'उद्धृत श्लोक', another: 'दुसरा प्रश्न विचारा', hint: 'थेट अध्याय वाचा किंवा प्रश्न वेगळ्या प्रकारे विचारा.', different: 'वेगळा प्रश्न विचारा', error: 'काहीतरी चुकले. पुन्हा प्रयत्न करा.', retry: 'पुन्हा प्रयत्न करा' },
  te: { label: 'గీత గురించి ప్రశ్న అడగండి', placeholder: 'భగవద్గీత గురించి అడగండి\nఉదాహరణ: కర్తవ్యం గురించి కృష్ణుడు ఏమి చెబుతాడు?', looking: 'శ్లోకాలలో వెతుకుతున్నాను…', answer: 'గ్రంథం నుండి సమాధానం', cited: 'ఉదహరించిన శ్లోకాలు', another: 'మరొక ప్రశ్న అడగండి', hint: 'అధ్యాయాలను నేరుగా చదవండి లేదా ప్రశ్నను మరోలా అడగండి.', different: 'వేరే ప్రశ్న అడగండి', error: 'ఏదో సమస్య జరిగింది. మళ్లీ ప్రయత్నించండి.', retry: 'మళ్లీ ప్రయత్నించండి' },
  ta: { label: 'கீதையைப் பற்றி கேள்வி கேளுங்கள்', placeholder: 'பகவத் கீதையைப் பற்றிக் கேளுங்கள்\nஉதாரணம்: கடமை பற்றி கிருஷ்ணர் என்ன கூறுகிறார்?', looking: 'சுலோகங்களில் தேடுகிறேன்…', answer: 'நூலிலிருந்து பதில்', cited: 'மேற்கோள் சுலோகங்கள்', another: 'மற்றொரு கேள்வி கேளுங்கள்', hint: 'அத்தியாயங்களை நேரடியாகப் படிக்கவும் அல்லது கேள்வியை வேறு விதமாகக் கேட்கவும்.', different: 'வேறு கேள்வி கேளுங்கள்', error: 'ஏதோ தவறு ஏற்பட்டது. மீண்டும் முயலவும்.', retry: 'மீண்டும் முயலவும்' },
};

const DiyaIcon = ({ className = "diya-icon" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    {/* Flame */}
    <path d="M16 6C16 6 10 12 10 18C10 21.314 12.686 24 16 24C19.314 24 22 21.314 22 18C22 12 16 6 16 6Z"
      fill="currentColor" opacity="0.9" />
    <path d="M16 10C16 10 13 14 13 18C13 19.657 14.343 21 16 21C17.657 21 19 19.657 19 18C19 14 16 10 16 10Z"
      fill="white" opacity="0.6" />
    {/* Lamp base */}
    <ellipse cx="16" cy="26" rx="8" ry="2" fill="currentColor" opacity="0.3" />
    <path d="M8 26 Q16 30 24 26" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </svg>
);

export default function AskPanel() {
  const { language, t } = useLanguage();
  const labels = ASK_COPY[language] || ASK_COPY.en;
  const [question, setQuestion] = useState('');
  const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'answered' | 'refused' | 'error'
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const canSubmit = question.trim().length >= 5 && state !== 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState('loading');
    setResult(null);

    try {
      const data = await askQuestion(question.trim(), [], [], language);
      setResult(data);
      setState(data.answered ? 'answered' : 'refused');
    } catch (err) {
      setState('error');
      setResult({ error: err.message });
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setQuestion('');
    inputRef.current?.focus();
  };

  return (
    <section className="ask-panel" aria-label={labels.label}>
      {/* Question form */}
      <form className="ask-panel__form" onSubmit={handleSubmit}>
        <div className="ask-panel__input-area">
          <textarea
            ref={inputRef}
            id="ask-question-input"
            className="ask-panel__textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={labels.placeholder}
            rows={3}
            maxLength={500}
            disabled={state === 'loading'}
            aria-label="Your question"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="ask-panel__form-footer">
            <span className="ask-panel__char-count text-muted">
              {question.length}/500
            </span>
            <AnimatedButton
              type="submit"
              className="ask-panel__submit"
              disabled={!canSubmit}
              id="ask-submit-btn"
            >
              {state === 'loading' ? t('working') : t('ask')}
            </AnimatedButton>
          </div>
        </div>
      </form>

      {/* Loading state - premium loader */}
      {state === 'loading' && (
        <div className="ask-panel__loading" role="status" aria-live="polite">
          <div className="sarathi-loader">
            <div className="sarathi-loader__flame-container">
              <div className="sarathi-loader__ring"></div>
              <div className="sarathi-loader__ring"></div>
              <div className="sarathi-loader__ring"></div>
              <DiyaIcon className="sarathi-loader__flame" />
            </div>
            <div className="sarathi-loader__dots">
              <span className="sarathi-loader__dot"></span>
              <span className="sarathi-loader__dot"></span>
              <span className="sarathi-loader__dot"></span>
            </div>
            <p className="sarathi-loader__text">{labels.looking}</p>
          </div>
        </div>
      )}

      {/* Answered state */}
      {state === 'answered' && result && (
        <div className="ask-panel__result page-turn-enter">
          <div className="ask-panel__answer">
            <h2 className="ask-panel__answer-heading">
              <span className="ask-panel__answer-icon">✦</span>
              {labels.answer}
            </h2>
            <p className="ask-panel__answer-text">{result.answer}</p>
          </div>

          {result.citations?.length > 0 && (
            <div className="ask-panel__citations">
              <h3 className="ask-panel__citations-heading">{labels.cited}</h3>
              <div className="ask-panel__citations-list">
                {result.citations.map((verse) => (
                  <IlluminatedVerseCard
                    key={verse.id}
                    verse={verse}
                    variant="citation"
                    similarity={verse.similarity}
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatedButton
            className="ask-panel__reset"
            onClick={handleReset}
            id="ask-new-question-btn"
          >
            {labels.another}
          </AnimatedButton>
        </div>
      )}

      {/* Refusal state - intentional, calm, not an error */}
      {state === 'refused' && result && (
        <div className="ask-panel__refusal page-turn-enter" role="status">
          <div className="ask-panel__refusal-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <path d="M24 14C24 14 18 20 18 26C18 29.314 20.686 32 24 32C27.314 32 30 29.314 30 26C30 20 24 14 24 14Z"
                fill="currentColor" opacity="0.25" />
            </svg>
          </div>
          <p className="ask-panel__refusal-text">{result.answer}</p>
          <p className="ask-panel__refusal-hint">
            {labels.hint}
          </p>
          <AnimatedButton
            className="ask-panel__reset ask-panel__reset--outline"
            onClick={handleReset}
            id="ask-try-again-btn"
          >
            {labels.different}
          </AnimatedButton>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="ask-panel__error" role="alert">
          <p>{labels.error}</p>
          <AnimatedButton className="ask-panel__reset ask-panel__reset--outline" onClick={handleReset}>
            {labels.retry}
          </AnimatedButton>
        </div>
      )}
    </section>
  );
}

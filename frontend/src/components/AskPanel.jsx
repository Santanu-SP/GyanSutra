/**
 * AskPanel — the AI Q&A interface.
 *
 * Loading state: diya flicker (opacity pulse, disabled if prefers-reduced-motion).
 * Refusal state: calm, intentional — looks deliberate, not like an error.
 * Answer state: response text + IlluminatedVerseCard citations, tappable.
 */

import { useState, useRef } from 'react';
import { askQuestion } from '../services/api';
import IlluminatedVerseCard from './IlluminatedVerseCard';
import './AskPanel.css';

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
      const data = await askQuestion(question.trim());
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
    <section className="ask-panel" aria-label="Ask a question about the Gita">
      {/* Question form */}
      <form className="ask-panel__form" onSubmit={handleSubmit}>
        <div className="ask-panel__input-area">
          <textarea
            ref={inputRef}
            id="ask-question-input"
            className="ask-panel__textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything from the Bhagavad Gita…&#10;e.g. What does Krishna say about duty?"
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
            <button
              type="submit"
              className="ask-panel__submit"
              disabled={!canSubmit}
              id="ask-submit-btn"
            >
              {state === 'loading' ? 'Seeking…' : 'Ask'}
            </button>
          </div>
        </div>
      </form>

      {/* Loading state — premium loader */}
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
            <p className="sarathi-loader__text">Searching the verses…</p>
          </div>
        </div>
      )}

      {/* Answered state */}
      {state === 'answered' && result && (
        <div className="ask-panel__result page-turn-enter">
          <div className="ask-panel__answer">
            <h2 className="ask-panel__answer-heading">
              <span className="ask-panel__answer-icon">✦</span>
              From the Scripture
            </h2>
            <p className="ask-panel__answer-text">{result.answer}</p>
          </div>

          {result.citations?.length > 0 && (
            <div className="ask-panel__citations">
              <h3 className="ask-panel__citations-heading">Cited Verses</h3>
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

          <button
            className="ask-panel__reset"
            onClick={handleReset}
            id="ask-new-question-btn"
          >
            Ask another question
          </button>
        </div>
      )}

      {/* Refusal state — intentional, calm, not an error */}
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
            Try exploring the chapters directly, or rephrase your question.
          </p>
          <button
            className="ask-panel__reset ask-panel__reset--outline"
            onClick={handleReset}
            id="ask-try-again-btn"
          >
            Try a different question
          </button>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="ask-panel__error" role="alert">
          <p>Something went wrong: {result?.error}</p>
          <button className="ask-panel__reset ask-panel__reset--outline" onClick={handleReset}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}

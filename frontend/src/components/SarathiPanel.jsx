/**
 * SarathiPanel — Gyan Sutra's spiritual companion.
 *
 * Named Sarathi (सारथि) — as Krishna was Arjuna's charioteer and guide.
 * This is not a chatbot. It is a companion for scripture reflection.
 *
 * Layout behavior:
 *   Desktop (≥1024px) : Fixed right side panel, 380px. Content shifts left.
 *   Mobile  (<1024px) : Bottom sheet sliding up to 55dvh. Scripture visible above.
 *
 * All functionality is passed in from App — this component is presentation only.
 */

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './SarathiPanel.css';

// Flame icon — Sarathi's identity mark
const SarathiFlame = ({ className = "sarathi-flame" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M16 4C16 4 8 11 8 18C8 22.418 11.582 26 16 26C20.418 26 24 22.418 24 18C24 11 16 4 16 4Z"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M16 10C16 10 12 14 12 18C12 20.209 13.791 22 16 22C18.209 22 20 20.209 20 18C20 14 16 10 16 10Z"
      fill="white"
      opacity="0.5"
    />
    <ellipse cx="16" cy="28" rx="7" ry="1.75" fill="currentColor" opacity="0.2" />
  </svg>
);

export default function SarathiPanel({
  isOpen,
  onClose,
  messages,
  question,
  setQuestion,
  onAsk,
  isLoading,
  suggestedPrompts,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to latest message start
  useEffect(() => {
    if (isOpen) {
      // Find the last message in the list
      const messagesContainer = document.querySelector('.sarathi-panel__messages');
      if (messagesContainer) {
        const messageElements = messagesContainer.querySelectorAll('.sarathi-msg');
        const lastMessage = messageElements[messageElements.length - 1];
        if (lastMessage) {
          lastMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages, isOpen]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Escape key closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const showSuggestions = messages.length <= 1;

  return (
    <>
      {/* Mobile + tablet backdrop — click to dismiss */}
      {isOpen && (
        <div
          className="sarathi-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* The panel itself */}
      <aside
        className={`sarathi-panel${isOpen ? ' sarathi-panel--open' : ''}`}
        role="complementary"
        aria-label="Sarathi — Your spiritual companion"
        aria-hidden={!isOpen}
        id="sarathi-panel"
      >
        {/* Mobile drag handle */}
        <div className="sarathi-panel__handle" aria-hidden="true" />

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sarathi-panel__header">
          <div className="sarathi-panel__identity">
            <SarathiFlame />
            <div className="sarathi-panel__identity-text">
              <h2 className="sarathi-panel__title">Sarathi</h2>
              <p className="sarathi-panel__title-devanagari">सारथि</p>
            </div>
          </div>
          <button
            type="button"
            className="sarathi-panel__close"
            onClick={onClose}
            aria-label="Close Sarathi"
            id="close-sarathi-btn"
          >
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M4 4L14 14M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {/* ── Suggested paths ─────────────────────────────────────── */}
        {showSuggestions && (
          <div className="sarathi-panel__paths">
            <p className="sarathi-panel__paths-label">Paths to Explore</p>
            <div className="sarathi-panel__paths-list">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="sarathi-panel__path-btn"
                  onClick={() => setQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Message thread ──────────────────────────────────────── */}
        <div
          className="sarathi-panel__messages"
          role="log"
          aria-live="polite"
          aria-label="Conversation with Sarathi"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`sarathi-msg sarathi-msg--${message.role}`}
            >
              <p className="sarathi-msg__label">
                {message.role === 'user' ? 'Your Reflection' : 'Sarathi'}
              </p>
              <div className="sarathi-msg__content">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="sarathi-msg sarathi-msg--sarathi">
              <p className="sarathi-msg__label">Sarathi</p>
              <div className="sarathi-loader">
                <div className="sarathi-loader__flame-container">
                  <div className="sarathi-loader__ring"></div>
                  <div className="sarathi-loader__ring"></div>
                  <div className="sarathi-loader__ring"></div>
                  <SarathiFlame className="sarathi-loader__flame" />
                </div>
                <div className="sarathi-loader__dots">
                  <span className="sarathi-loader__dot"></span>
                  <span className="sarathi-loader__dot"></span>
                  <span className="sarathi-loader__dot"></span>
                </div>
                <p className="sarathi-loader__text">Reflecting on the scripture…</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* ── Input form ──────────────────────────────────────────── */}
        <form
          className="sarathi-panel__form"
          onSubmit={onAsk}
          aria-label="Ask Sarathi"
        >
          <div className="sarathi-panel__input-wrap">
            <textarea
              ref={textareaRef}
              id="sarathi-textarea"
              className="sarathi-panel__textarea"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="Ask about dharma, a verse, devotion, or any teaching…"
              disabled={isLoading}
              aria-label="Your question for Sarathi"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onAsk(e);
                }
              }}
            />
            <div className="sarathi-panel__form-footer">
              <p className="sarathi-panel__grounded-note">
                Responses cite chapter &amp; verse
              </p>
              <button
                type="submit"
                className="sarathi-panel__submit"
                disabled={isLoading || !question.trim()}
                id="sarathi-submit-btn"
              >
                {isLoading ? 'Seeking…' : 'Seek Guidance'}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

/**
 * SarathiPanel - Gyan Sutra's spiritual companion.
 *
 * Named Sarathi (सारथि) - as Krishna was Arjuna's charioteer and guide.
 * This is not a chatbot. It is a companion for scripture reflection.
 *
 * Layout behavior:
 *   Desktop (≥1024px) : Fixed right side panel. Content shifts left.
 *   Mobile  (<1024px) :
 *     - Opens at a comfortable reading height and can expand to full height
 *     - Resizable bottom sheet with three snap zones
 *     - Smooth open, resize, and minimize motion
 *     - Size-snap buttons in header for quick height switching
 *
 * Props:
 *   isOpen, onClose, onOpen - panel open/close state
 *   messages, question, setQuestion, onAsk, isLoading - chat state
 *   suggestedPrompts - initial path buttons
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import AnimatedButton from './AnimatedButton';
import useLanguage from '../i18n/useLanguage';

import './SarathiPanel.css';

// Snap zone heights (dvh)
const SNAP = { peek: 36, normal: 82, full: 100 };

// ── Icons ──────────────────────────────────────────────────────────────────

const SarathiFlame = ({ className = 'sarathi-flame' }) => (
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

const NormalIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 8.5h12v7H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7 4.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ExpandIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 7V4h3M13 4h3v3M16 13v3h-3M7 16H4v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** True when viewport is mobile-width (<1024px). Checked once per open. */
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
}

function citationLabel(citation, language, t) {
  const idParts = citation.id?.split('_') || [];
  if (citation.book === 'Bhagavad Gita' || citation.id?.startsWith('bhagavad-gita_')) {
    const chapter = citation.chapterNumber || idParts[1];
    const verse = citation.verseNumber || idParts[2];
    return `${language === 'en' ? 'Bhagavad Gita' : t('heroTitleHighlight')} ${chapter}.${verse}`;
  }

  if (citation.id?.startsWith('valmiki-ramayana_')) {
    const kanda = citation.kandaNumber || idParts[1];
    const sarga = citation.sarga || idParts[2];
    const shloka = citation.shlokaNumber || idParts[3];
    return `${language === 'en' ? 'Valmiki Ramayana' : t('ramayana')} ${kanda}.${sarga}.${shloka}`;
  }

  return citation.book || 'Scripture source';
}

// ── Component ──────────────────────────────────────────────────────────────

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
  const { language, t } = useLanguage();
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const dragStartRef   = useRef(null);          // { y: number, startH: number }
  const dynamicHRef    = useRef(null);          // live dvh value during drag
  const panelSizeRef   = useRef('normal');      // shadow of panelSize for stable callbacks
  const hasOpenedRef   = useRef(false);         // tracks if panel has been opened before

  // Desktop ignores panel height; mobile opens at a comfortable reading height.
  const [panelSize, _setPanelSize]       = useState('normal'); // 'peek' | 'normal' | 'full'
  const [isMinimizing, setIsMinimizing]  = useState(false);
  const [isDragging, setIsDragging]      = useState(false);
  const [dynamicHeight, setDynamicHeight] = useState(null);    // dvh number during drag; null = use snap

  // Keep ref in sync
  const setPanelSize = (s) => { panelSizeRef.current = s; _setPanelSize(s); };

  // Current height in dvh - dynamic during drag, snap zone otherwise
  const currentDvh = isDragging && dynamicHeight !== null ? dynamicHeight : SNAP[panelSize];

  // ── Set a comfortable initial height on mobile ───────────────────────
  useEffect(() => {
    if (isOpen && isMobileViewport() && !hasOpenedRef.current) {
      setPanelSize('normal');
      hasOpenedRef.current = true;
    }
  }, [isOpen]);

  // ── Minimize panel ────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setIsMinimizing(true);
    setTimeout(() => {
      onClose();
      setIsMinimizing(false);
    }, 260);
  }, [onClose]);

  // ── Drag handle: start ─────────────────────────────────────────────────
  function startDrag(clientY) {
    const startH = dynamicHRef.current ?? SNAP[panelSizeRef.current];
    dragStartRef.current = { y: clientY, startH };
    dynamicHRef.current  = startH;
    setIsDragging(true);
  }

  // ── Drag handle: move (stable ref, no stale closure) ──────────────────
  const onDragMove = useCallback((clientY) => {
    if (!dragStartRef.current) return;
    const delta    = dragStartRef.current.y - clientY; // positive = dragged up = taller
    const dvhDelta = (delta / window.innerHeight) * 100;
    const newH     = Math.max(14, Math.min(100, dragStartRef.current.startH + dvhDelta));
    dynamicHRef.current = newH;
    setDynamicHeight(newH);
  }, []);

  // ── Drag handle: end + snap ────────────────────────────────────────────
  const onDragEnd = useCallback(() => {
    const h = dynamicHRef.current ?? SNAP[panelSizeRef.current];
    // If dragged below 18dvh, close the panel entirely (swipe-to-dismiss)
    if (h < 18) {
      setPanelSize('peek');
      setDynamicHeight(null);
      dynamicHRef.current  = null;
      dragStartRef.current = null;
      setIsDragging(false);
      handleClose();
      return;
    }
    // Find nearest snap zone
    const nearest = (Object.keys(SNAP)).reduce((best, name) =>
      Math.abs(SNAP[name] - h) < Math.abs(SNAP[best] - h) ? name : best,
      'normal'
    );
    setPanelSize(nearest);
    setDynamicHeight(null);
    dynamicHRef.current  = null;
    dragStartRef.current = null;
    setIsDragging(false);
  }, [handleClose]);

  // Attach document-level move/up listeners only while dragging
  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e) => onDragMove(e.clientY);
    const onTouchMove = (e) => { e.preventDefault(); onDragMove(e.touches[0].clientY); };
    const onUp        = () => onDragEnd();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend',  onUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend',  onUp);
    };
  }, [isDragging, onDragMove, onDragEnd]);

  // ── Scroll to latest message ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const container = document.querySelector('.sarathi-panel__messages');
    if (!container) return;
    const msgs = container.querySelectorAll('.sarathi-msg');
    const last  = msgs[msgs.length - 1];
    if (last)                 last.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Focus the composer on desktop. On mobile this would open the keyboard
  // immediately and hide the useful part of the conversation.
  useEffect(() => {
    if (!isOpen || isMobileViewport() || !textareaRef.current) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ── Escape closes ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  const showSuggestions = messages.length <= 1;

  // Panel CSS classes
  const panelClasses = [
    'sarathi-panel',
    `sarathi-panel--${panelSize}`,
    isOpen        ? 'sarathi-panel--open'       : '',
    isMinimizing  ? 'sarathi-panel--minimizing'  : '',
    isDragging    ? 'sarathi-panel--dragging'    : '',
  ].filter(Boolean).join(' ');

  return (
    <>

      {/* ── Mobile backdrop - only for normal/full sizes (peek lets user see screen) ── */}
      {isOpen && panelSize !== 'peek' && (
        <div
          className="sarathi-backdrop"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* ── The panel itself ─────────────────────────────────────────────── */}
      <aside
        className={panelClasses}
        style={{ '--sarathi-panel-h': `${currentDvh}dvh` }}
        role="complementary"
        aria-label={`Sarathi: ${t('scriptureGuide')}`}
        aria-hidden={!isOpen}
        id="sarathi-panel"
      >
        {/* ── Mobile drag handle - grab & pull to resize ──────────────── */}
        <div
          className="sarathi-panel__handle"
          aria-label="Drag to resize panel"
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientY); }}
          onTouchStart={(e) => startDrag(e.touches[0].clientY)}
        >
          <span className="sarathi-panel__handle-bar" aria-hidden="true" />
        </div>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="sarathi-panel__header">
          <div className="sarathi-panel__identity">
            <SarathiFlame />
            <div className="sarathi-panel__identity-text">
              <h2 className="sarathi-panel__title">
                Sarathi <span lang="hi">सारथि</span>
              </h2>
              <p className="sarathi-panel__subtitle">{t('scriptureGuide')}</p>
            </div>
          </div>

          {/* Header Controls (Mobile & Desktop) ────────────────────────── */}
          <div className="sarathi-panel__header-btns">
            {/* Maximise / Restore button (Mobile only, Desktop is fixed) */}
            <div className="sarathi-panel__size-btns" role="group" aria-label="Resize panel">
              <AnimatedButton
                type="button"
                className="active-press sarathi-panel__header-btn sarathi-panel__header-btn--resize"
                onClick={() => setPanelSize(panelSize === 'full' ? 'normal' : 'full')}
                aria-label={panelSize === 'full' ? "Restore panel size" : "Maximise panel"}
                title={panelSize === 'full' ? "Restore" : "Maximise"}
              >
                {panelSize === 'full' ? <NormalIcon /> : <ExpandIcon />}
              </AnimatedButton>
            </div>

            {/* Close button */}
            <AnimatedButton
              type="button"
              className="active-press sarathi-panel__header-btn sarathi-panel__header-btn--minimize"
              onClick={handleClose}
              aria-label="Minimize Sarathi"
              title="Minimize Sarathi"
              id="close-sarathi-btn"
            >
              <svg className="sarathi-panel__minimize-icon sarathi-panel__minimize-icon--mobile" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5.5 8L10 12.5L14.5 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className="sarathi-panel__minimize-icon sarathi-panel__minimize-icon--desktop" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4h5v12H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M11 10h5M13.5 7.5L16 10l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </AnimatedButton>
          </div>
        </header>

        <div className="sarathi-panel__body">
          {/* ── Message thread ─────────────────────────────────────────── */}
          <div
            className="sarathi-panel__messages"
            role="log"
            aria-live="polite"
            aria-label="Conversation with Sarathi"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`sarathi-msg sarathi-msg--${message.role}${message.id === 'welcome' ? ' sarathi-msg--welcome' : ''} sarathi-msg-enter`}
              >
                <p className="sarathi-msg__label">
                  {message.role === 'user' ? t('you') : 'Sarathi'}
                </p>
                <div className="sarathi-msg__content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {message.role === 'sarathi' && message.citations?.length > 0 && (
                    <div className="sarathi-msg__sources" aria-label="Sources used for this answer">
                      <p className="sarathi-msg__sources-label">{t('sources')}</p>
                      <div className="sarathi-msg__source-list">
                        {message.citations.map((citation, index) => (
                          <span className="sarathi-msg__source" key={citation.id || index}>
                            <span className="sarathi-msg__source-marker">[S{index + 1}]</span>
                            {citationLabel(citation, language, t)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="sarathi-msg sarathi-msg--sarathi sarathi-msg-enter">
                <p className="sarathi-msg__label">Sarathi</p>
                <div className="sarathi-msg__content" style={{ border: 'none', background: 'transparent', padding: '0.5rem 0' }}>
                  <div className="shimmer-skeleton"></div>
                  <div className="shimmer-skeleton"></div>
                  <div className="shimmer-skeleton short"></div>
                </div>
                <div className="sarathi-loader">
                  <p className="sarathi-loader__text">{t('looking')}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>

          {/* ── Suggested paths ────────────────────────────────────────── */}
          {showSuggestions && (
            <div className="sarathi-panel__paths">
              <p className="sarathi-panel__paths-label">{t('tryAsking')}</p>
              <div className="sarathi-panel__paths-list">
                {suggestedPrompts.map((prompt) => (
                  <AnimatedButton
                    key={prompt}
                    type="button"
                    className="active-press sarathi-panel__path-btn"
                    onClick={() => setQuestion(prompt)}
                  >
                    <span>{prompt}</span>
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M6 10h8M11 7l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </AnimatedButton>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Input form ──────────────────────────────────────────────── */}
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
              rows={2}
              placeholder={t('askPlaceholder')}
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
                {t('groundedNote')}
              </p>
              <AnimatedButton
                type="submit"
                className="active-press sarathi-panel__submit"
                disabled={isLoading || !question.trim()}
                id="sarathi-submit-btn"
              >
                {isLoading ? t('working') : t('ask')}
              </AnimatedButton>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}

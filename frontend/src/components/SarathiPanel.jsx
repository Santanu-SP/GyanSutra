/**
 * SarathiPanel — Gyan Sutra's spiritual companion.
 *
 * Named Sarathi (सारथि) — as Krishna was Arjuna's charioteer and guide.
 * This is not a chatbot. It is a companion for scripture reflection.
 *
 * Layout behavior:
 *   Desktop (≥1024px) : Fixed right side panel, 380px. Content shifts left. (unchanged)
 *   Mobile  (<1024px) :
 *     - Resizable bottom sheet (drag handle → snap zones: peek 28dvh / normal 55dvh / full 90dvh)
 *     - macOS-style minimize animation — panel shrinks to bottom-right floating pill
 *     - Floating Sarathi pill — persists when panel is closed, springs back on tap
 *     - Size-snap buttons in header for quick height switching
 *
 * Props:
 *   isOpen, onClose, onOpen — panel open/close state
 *   messages, question, setQuestion, onAsk, isLoading — chat state
 *   suggestedPrompts — initial path buttons
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './SarathiPanel.css';

// Snap zone heights (dvh)
const SNAP = { peek: 28, normal: 55, full: 90 };

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

// Size snap button icons
const PeekIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="13" height="13">
    <rect x="1" y="11" width="14" height="4" rx="1.5" fill="currentColor" opacity="0.9" />
    <rect x="4" y="8"  width="8"  height="2" rx="1"   fill="currentColor" opacity="0.4" />
    <rect x="6" y="5"  width="4"  height="2" rx="1"   fill="currentColor" opacity="0.2" />
  </svg>
);

const NormalIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="13" height="13">
    <rect x="1" y="6"  width="14" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
    <rect x="4" y="3"  width="8"  height="2" rx="1"   fill="currentColor" opacity="0.4" />
  </svg>
);

const ExpandIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="13" height="13">
    <rect x="1" y="1"  width="14" height="14" rx="1.5" fill="currentColor" opacity="0.9" />
    <path d="M5.5 6L8 3.5L10.5 6" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
    <path d="M5.5 10L8 12.5L10.5 10" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────

export default function SarathiPanel({
  isOpen,
  onClose,
  onOpen,
  messages,
  question,
  setQuestion,
  onAsk,
  isLoading,
  suggestedPrompts,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const dragStartRef   = useRef(null);          // { y: number, startH: number }
  const dynamicHRef    = useRef(null);          // live dvh value during drag
  const panelSizeRef   = useRef('normal');      // shadow of panelSize for stable callbacks

  const [panelSize, _setPanelSize]       = useState('normal'); // 'peek' | 'normal' | 'full'
  const [isMinimizing, setIsMinimizing]  = useState(false);
  const [isDragging, setIsDragging]      = useState(false);
  const [dynamicHeight, setDynamicHeight] = useState(null);    // dvh number during drag; null = use snap

  // Keep ref in sync
  const setPanelSize = (s) => { panelSizeRef.current = s; _setPanelSize(s); };

  // Current height in dvh — dynamic during drag, snap zone otherwise
  const currentDvh = isDragging && dynamicHeight !== null ? dynamicHeight : SNAP[panelSize];

  // ── macOS-style minimize close ─────────────────────────────────────────
  function handleClose() {
    setIsMinimizing(true);
    setTimeout(() => {
      onClose();
      setIsMinimizing(false);
    }, 400); // matches the CSS transition duration
  }

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
    const newH     = Math.max(14, Math.min(93, dragStartRef.current.startH + dvhDelta));
    dynamicHRef.current = newH;
    setDynamicHeight(newH);
  }, []);

  // ── Drag handle: end + snap ────────────────────────────────────────────
  const onDragEnd = useCallback(() => {
    const h = dynamicHRef.current ?? SNAP[panelSizeRef.current];
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
  }, []);

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

  // ── Focus textarea when panel opens ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || !textareaRef.current) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ── Escape closes ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const showSuggestions = messages.length <= 1;

  // Panel CSS classes
  const panelClasses = [
    'sarathi-panel',
    isOpen        ? 'sarathi-panel--open'       : '',
    isMinimizing  ? 'sarathi-panel--minimizing'  : '',
    isDragging    ? 'sarathi-panel--dragging'    : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* ── Floating Sarathi pill — mobile only, shown when panel is closed ── */}
      <button
        type="button"
        className={`sarathi-pill${!isOpen ? ' sarathi-pill--visible' : ''}`}
        onClick={onOpen}
        aria-label="Open Sarathi — your spiritual companion"
        id="sarathi-pill-btn"
      >
        <span className="sarathi-pill__glow" aria-hidden="true" />
        <SarathiFlame className="sarathi-pill__flame" />
        <span className="sarathi-pill__label">Sarathi</span>
      </button>

      {/* ── Mobile backdrop — only for normal/full sizes (peek lets user see screen) ── */}
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
        aria-label="Sarathi — Your spiritual companion"
        aria-hidden={!isOpen}
        id="sarathi-panel"
      >
        {/* ── Mobile drag handle — grab & pull to resize ──────────────── */}
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
              <h2 className="sarathi-panel__title">Sarathi</h2>
              <p className="sarathi-panel__title-devanagari">सारथि</p>
            </div>
          </div>

          {/* Size snap buttons — mobile only ────────────────────────── */}
          <div className="sarathi-panel__size-btns" aria-label="Resize panel">
            <button
              type="button"
              className={`sarathi-size-btn${panelSize === 'peek' ? ' sarathi-size-btn--active' : ''}`}
              onClick={() => setPanelSize('peek')}
              aria-label="Compact — peek view"
              title="Compact"
              id="sarathi-size-peek"
            >
              <PeekIcon />
            </button>
            <button
              type="button"
              className={`sarathi-size-btn${panelSize === 'normal' ? ' sarathi-size-btn--active' : ''}`}
              onClick={() => setPanelSize('normal')}
              aria-label="Normal — half screen view"
              title="Normal"
              id="sarathi-size-normal"
            >
              <NormalIcon />
            </button>
            <button
              type="button"
              className={`sarathi-size-btn${panelSize === 'full' ? ' sarathi-size-btn--active' : ''}`}
              onClick={() => setPanelSize('full')}
              aria-label="Full — expanded view"
              title="Full"
              id="sarathi-size-full"
            >
              <ExpandIcon />
            </button>
          </div>

          {/* Minimise button — triggers macOS-style animation ─────────── */}
          <button
            type="button"
            className="sarathi-panel__close"
            onClick={handleClose}
            aria-label="Minimise Sarathi"
            id="close-sarathi-btn"
          >
            {/* Horizontal bar = macOS minimise metaphor */}
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M4 9H14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {/* ── Suggested paths ──────────────────────────────────────────── */}
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

        {/* ── Message thread ───────────────────────────────────────────── */}
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

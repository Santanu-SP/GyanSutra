/**
 * App.jsx — Gyan Sutra application root.
 *
 * Layout:
 *   - Sticky header with brand, search, ThemeToggle, Sarathi trigger
 *   - App body shifts right on desktop when Sarathi is open
 *   - SarathiPanel: desktop side panel / mobile bottom sheet (non-blocking)
 *   - Routes: all pages including previously unconnected ones
 *
 * Sarathi state lives here — SarathiPanel is presentation only.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { askQuestion } from './services/api';
import Home from './pages/Home';
import TextReader from './pages/TextReader';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import SarathiPanel from './components/SarathiPanel';
import LoadingSpinner from './components/LoadingSpinner';
import './app.css';

// Lazy-load heavier pages to keep initial bundle small
const ChapterReader = lazy(() => import('./pages/ChapterReader'));
const Search        = lazy(() => import('./pages/Search'));
const VerseDetail   = lazy(() => import('./pages/VerseDetail'));
const Ramayana      = lazy(() => import('./pages/Ramayana'));
const KandaReader   = lazy(() => import('./pages/KandaReader'));

// Suggested conversation starters — shown when panel is first opened
const SARATHI_PROMPTS = [
  'What does the Gita teach about duty?',
  'Explain detachment in simple words.',
  'How does Sanatan wisdom guide daily life?',
];

// Premium page loading state
function PageLoader() {
  return (
    <LoadingSpinner fullPage={true} text="Loading..." />
  );
}

// Flame icon used in the Sarathi trigger button
function TriggerFlame() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="sarathi-trigger__icon"
      aria-hidden="true"
    >
      <path
        d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M10 7C10 7 8 9.5 8 12C8 13.105 8.895 14 10 14C11.105 14 12 13.105 12 12C12 9.5 10 7 10 7Z"
        fill="white"
        opacity="0.5"
      />
      <ellipse cx="10" cy="18" rx="5" ry="1.25" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

// Automatically scrolls to top when navigating to a new route
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  const [isSarathiOpen, setIsSarathiOpen] = useState(false);
  const [question, setQuestion]           = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [messages, setMessages]           = useState([
    {
      id: 'welcome',
      role: 'sarathi',
      content:
        'I am here to illuminate what the scripture holds. Ask anything from the verses you are reading.',
    },
  ]);

  useEffect(() => {
    const handleOpenSarathi = (e) => {
      if (e.detail?.prompt) {
        setQuestion(e.detail.prompt);
      }
      setIsSarathiOpen(true);
    };
    window.addEventListener('open-sarathi', handleOpenSarathi);
    return () => window.removeEventListener('open-sarathi', handleOpenSarathi);
  }, []);

  async function handleAsk(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setMessages((cur) => [
      ...cur,
      { id: `${Date.now()}-user`, role: 'user', content: trimmed },
    ]);
    setQuestion('');
    setIsLoading(true);

    try {
      const result = await askQuestion(trimmed);
      setMessages((cur) => [
        ...cur,
        {
          id: `${Date.now()}-sarathi`,
          role: 'sarathi',
          content: result.answer || 'No answer was returned.',
        },
      ]);
    } catch (error) {
      setMessages((cur) => [
        ...cur,
        {
          id: `${Date.now()}-error`,
          role: 'sarathi',
          content: error.message || 'Sarathi could not respond right now.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // Called from Home page prompt buttons — pre-fills question and opens panel
  function handlePromptSelect(prompt) {
    setQuestion(prompt);
    setIsSarathiOpen(true);
  }

  return (
    <div className="gs-app">
      <ScrollToTop />
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="gs-header">
        <nav className="gs-header__nav">
          {/* Brand */}
          <Link to="/" className="gs-header__brand" aria-label="Gyan Sutra — Home">
            <img
              src="/icons/logo.svg"
              alt="Gyan Sutra"
              className="gs-header__logo"
            />
            <span className="gs-header__brand-text">
              <span className="gs-header__name">Gyan Sutra</span>
              <span className="gs-header__tagline">Sacred Library</span>
            </span>
          </Link>

          {/* Global search — hidden on small mobile */}
          <div className="gs-header__search-wrap">
            <SearchBar placeholder="Search scripture… (⌘K)" />
          </div>

          {/* Right actions */}
          <div className="gs-header__actions">
            <ThemeToggle />
            <button
              type="button"
              className="sarathi-trigger"
              onClick={() => setIsSarathiOpen(true)}
              aria-label="Open Sarathi — your spiritual companion"
              aria-expanded={isSarathiOpen}
              aria-controls="sarathi-panel"
              id="open-sarathi-btn"
            >
              <TriggerFlame />
              <span className="sarathi-trigger__label">Sarathi</span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── App body — shifts right on desktop when Sarathi is open ── */}
      <div className={`gs-body${isSarathiOpen ? ' gs-body--sarathi-open' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={<Home onAskPrompt={handlePromptSelect} />}
            />
            {/* Bhagavad Gita chapter navigator */}
            <Route path="/chapters/:id" element={<ChapterReader />} />
            {/* Ramayana Kanda navigator */}
            <Route path="/ramayana" element={<Ramayana />} />
            <Route path="/ramayana/:kandaNum" element={<KandaReader />} />
            {/* Source pages (Bhagavad Gita, etc.) */}
            <Route path="/:source_id" element={<TextReader />} />
            {/* Search */}
            <Route path="/search" element={<Search />} />
            {/* Individual verse */}
            <Route path="/verses/:id" element={<VerseDetail />} />
          </Routes>
        </Suspense>
      </div>

      {/* ── Sarathi companion — side panel on desktop, sheet on mobile ── */}
      <SarathiPanel
        isOpen={isSarathiOpen}
        onClose={() => setIsSarathiOpen(false)}
        messages={messages}
        question={question}
        setQuestion={setQuestion}
        onAsk={handleAsk}
        isLoading={isLoading}
        suggestedPrompts={SARATHI_PROMPTS}
      />
    </div>
  );
}

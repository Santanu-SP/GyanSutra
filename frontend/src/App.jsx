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
import { AnimatePresence, motion } from 'framer-motion';
import { askQuestion } from './services/api';
import Home from './pages/Home';
import TextReader from './pages/TextReader';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import SarathiPanel from './components/SarathiPanel';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import SEO from './components/SEO';
import AnimatedButton from './components/AnimatedButton';

import './app.css';

// Helper to safely lazy load routes and auto-reload on chunk load failure (stale JS build)
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn('Dynamic import chunk load failed. Reloading page to fetch latest version...', error);
      window.location.reload();
      return new Promise(() => {});
    }
  });
}

// Lazy-load heavier pages to keep initial bundle small
const ChapterReader = lazyWithRetry(() => import('./pages/ChapterReader'));
const Search        = lazyWithRetry(() => import('./pages/Search'));
const VerseDetail   = lazyWithRetry(() => import('./pages/VerseDetail'));
const Ramayana      = lazyWithRetry(() => import('./pages/Ramayana'));
const KandaReader   = lazyWithRetry(() => import('./pages/KandaReader'));

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

// Wrapper for soft route transitions
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="page-transition-wrapper"
    >
      {children}
    </motion.div>
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



export default function App() {
  const location = useLocation();
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

    const userMessage = { id: `${Date.now()}-user`, role: 'user', content: trimmed };
    setMessages((cur) => [...cur, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      // Build history from existing messages (exclude the welcome message and the one we just added).
      // Only send the last 6 messages (3 exchanges) — enough for follow-ups without confusion.
      const history = [...messages, userMessage]
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const result = await askQuestion(trimmed, history);
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
      <SEO />
      {/* ── Fixed Header ── */}
      <header className={`gs-header${isSarathiOpen ? ' gs-header--sarathi-open' : ''}`}>
        <nav className="gs-header__nav">
          {/* Brand */}
          <Link to="/" className="gs-header__brand" aria-label="Gyan Sutra — Home">
            <img
              src={`${import.meta.env.BASE_URL}icons/logo.svg`}
              alt="Gyan Sutra"
              className="gs-header__logo"
            />
            <span className="gs-header__brand-text">
              <span className="gs-header__name">Gyan Sutra</span>
              <span className="gs-header__tagline">Sacred Library</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="gs-header__nav-links" aria-label="Primary navigation">
            <Link to="/" className={`gs-header__nav-link${location.pathname === '/' ? ' gs-header__nav-link--active' : ''}`}>Home</Link>
            <Link to="/bhagavad-gita" className={`gs-header__nav-link${location.pathname.startsWith('/bhagavad-gita') || location.pathname.startsWith('/chapters') ? ' gs-header__nav-link--active' : ''}`}>Gita</Link>
            <Link to="/ramayana" className={`gs-header__nav-link${location.pathname.startsWith('/ramayana') ? ' gs-header__nav-link--active' : ''}`}>Ramayana</Link>
          </nav>

          {/* Global search — hidden on small mobile */}
          <div className="gs-header__search-wrap">
            <SearchBar placeholder="Search scripture… (⌘K)" />
          </div>

          {/* Right actions */}
          <div className="gs-header__actions">
            <AnimatedButton
              className="group relative inline-flex items-center justify-center p-[1px] rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_1rem_-0.25rem_rgba(245,158,11,0.25)]"
              onClick={() => setIsSarathiOpen(true)}
              aria-label="Open Sarathi companion"
            >
              <div className="relative flex h-full w-full items-center justify-center">
                {/* Spinning gradient border */}
                <span className="absolute left-1/2 top-1/2 aspect-square w-[400%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#f59e0b_0%,transparent_30%,transparent_70%,#f59e0b_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Inner button surface */}
                <span className="relative z-10 flex h-full w-full items-center gap-[0.4rem] rounded-[7px] bg-[color:var(--bg)] px-[0.875rem] py-[0.45rem] font-body text-[length:var(--text-sm)] font-medium tracking-[0.04em] text-[color:var(--marigold)]">
                  <TriggerFlame />
                  <span className="sarathi-trigger__label">Ask Sarathi</span>
                </span>
              </div>
            </AnimatedButton>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* ── App body — shifts right on desktop when Sarathi is open ── */}
      <div className={`gs-body${isSarathiOpen ? ' gs-body--sarathi-open' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={<PageTransition><Home onAskPrompt={handlePromptSelect} /></PageTransition>}
                />
                <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
                <Route path="/verses/:id" element={<PageTransition><VerseDetail /></PageTransition>} />
                <Route path="/chapters/:id" element={<PageTransition><ChapterReader /></PageTransition>} />
                <Route path="/ramayana" element={<PageTransition><Ramayana /></PageTransition>} />
                <Route path="/ramayana/:kandaNum" element={<PageTransition><KandaReader /></PageTransition>} />
                <Route path="/:source_id" element={<PageTransition><TextReader /></PageTransition>} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* ── Sarathi companion — side panel on desktop, sheet on mobile ── */}
      <SarathiPanel
        isOpen={isSarathiOpen}
        onClose={() => setIsSarathiOpen(false)}
        onOpen={() => setIsSarathiOpen(true)}
        messages={messages}
        question={question}
        setQuestion={setQuestion}
        onAsk={handleAsk}
        isLoading={isLoading}
        suggestedPrompts={SARATHI_PROMPTS}
      />

      {/* ── Mobile bottom navigation bar ───────────────────────────── */}
      <nav className="gs-bottom-nav" aria-label="Mobile navigation">
        <Link
          to="/"
          className={`gs-bottom-nav__item${location.pathname === '/' ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label="Home"
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" />
          </svg>
          Home
        </Link>

        <Link
          to="/search"
          className={`gs-bottom-nav__item${location.pathname === '/search' ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label="Search"
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path strokeLinecap="round" d="M15.5 15.5L21 21" />
          </svg>
          Search
        </Link>
      </nav>
    </div>
  );
}

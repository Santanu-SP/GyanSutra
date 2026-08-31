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
import ThemeToggle from './components/ThemeToggle';
import SarathiPanel from './components/SarathiPanel';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import SEOHead from './components/SEO/SEOHead';
import AnimatedButton from './components/AnimatedButton';
import Footer from './components/Footer';

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
const FAQ           = lazyWithRetry(() => import('./pages/FAQ'));
const Ask           = lazyWithRetry(() => import('./pages/Ask'));

// Suggested conversation starters — shown when panel is first opened
const SARATHI_PROMPTS = [
  'What does the Gita teach about duty?',
  'Explain detachment in simple words.',
  'Which verses can help with a difficult decision?',
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
        'Ask about a verse, teaching, or difficult idea. I will answer from the texts in this library.',
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

  useEffect(() => {
    setIsSarathiOpen(false);
  }, [location.pathname]);

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

  const isGitaRoute = location.pathname.startsWith('/bhagavad-gita')
    || location.pathname.startsWith('/chapters')
    || location.pathname.startsWith('/verses');
  const isRamayanaRoute = location.pathname.startsWith('/ramayana');

  return (
    <div className="gs-app">
        <SEOHead />
        {/* ── Fixed Header ── */}
      <header className={`gs-header${isSarathiOpen ? ' gs-header--sarathi-open' : ''}`}>
        <div className="gs-header__nav">
          {/* Brand */}
          <Link to="/" className="gs-header__brand" aria-label="Gyan Sutra home">
            <img
              src={`${import.meta.env.BASE_URL}icons/logo.svg`}
              alt="Gyan Sutra"
              className="gs-header__logo"
            />
            <span className="gs-header__brand-text">
              <span className="gs-header__name">Gyan Sutra</span>
              <span className="gs-header__tagline">Scripture Library</span>
            </span>
          </Link>

          {/* Right Side Elements */}
          <div className="gs-header__right">
            {/* Reading links stay in the desktop header. */}
            <nav className="gs-header__nav-links" aria-label="Primary navigation">
              <span className="gs-header__nav-label">Read</span>
              <Link to="/bhagavad-gita" aria-current={isGitaRoute ? 'page' : undefined} className={`gs-header__nav-link${isGitaRoute ? ' gs-header__nav-link--active' : ''}`}>Bhagavad Gita</Link>
              <Link to="/ramayana" aria-current={isRamayanaRoute ? 'page' : undefined} className={`gs-header__nav-link${isRamayanaRoute ? ' gs-header__nav-link--active' : ''}`}>Ramayana</Link>
            </nav>

            {/* Utility actions stay in the header on every screen. */}
            <div className="gs-header__actions">
              <Link
                to="/search"
                className="gs-header__search-action"
                aria-label="Search scripture"
                aria-current={location.pathname === '/search' ? 'page' : undefined}
                title="Search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path strokeLinecap="round" d="M15.5 15.5L21 21" />
                </svg>
              </Link>
              <AnimatedButton
                className="sarathi-trigger"
                onClick={() => setIsSarathiOpen(true)}
                aria-label="Open Sarathi"
              >
                <TriggerFlame />
                <span className="sarathi-trigger__label">Ask Sarathi</span>
              </AnimatedButton>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ── App body — shifts right on desktop when Sarathi is open ── */}
      <div className={`gs-body${isSarathiOpen ? ' gs-body--sarathi-open' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={<PageTransition><Home /></PageTransition>}
                />
                <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
                <Route path="/verses/:id" element={<PageTransition><VerseDetail /></PageTransition>} />
                <Route path="/chapters/:id" element={<PageTransition><ChapterReader /></PageTransition>} />
                <Route path="/ramayana" element={<PageTransition><Ramayana /></PageTransition>} />
                <Route path="/ramayana/:kandaNum" element={<PageTransition><KandaReader /></PageTransition>} />
                <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
                <Route path="/ask" element={<PageTransition><Ask /></PageTransition>} />
                <Route path="/:source_id" element={<PageTransition><TextReader /></PageTransition>} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
        <Footer />
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

      {/* ── Mobile bottom navigation: destinations only ───────────── */}
      <nav className="gs-bottom-nav" aria-label="Mobile navigation">
        <Link
          to="/"
          className={`gs-bottom-nav__item${location.pathname === '/' ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label="Home"
          aria-current={location.pathname === '/' ? 'page' : undefined}
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" />
          </svg>
          Home
        </Link>

        <Link
          to="/bhagavad-gita"
          className={`gs-bottom-nav__item${isGitaRoute ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label="Read the Bhagavad Gita"
          aria-current={isGitaRoute ? 'page' : undefined}
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 016.75 3H12v16.5H6.75a2.25 2.25 0 00-2.25 1.125V5.25zM19.5 5.25A2.25 2.25 0 0017.25 3H12v16.5h5.25a2.25 2.25 0 012.25 1.125V5.25z" />
          </svg>
          Gita
        </Link>

        <Link
          to="/ramayana"
          className={`gs-bottom-nav__item${isRamayanaRoute ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label="Read the Ramayana"
          aria-current={isRamayanaRoute ? 'page' : undefined}
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12A1.5 1.5 0 0119.5 6v13.5H7.25A2.75 2.75 0 014.5 16.75V6A1.5 1.5 0 016 4.5z" />
            <path strokeLinecap="round" d="M7.25 16.5H19.5M8.5 8h7M8.5 11h5" />
          </svg>
          Ramayana
        </Link>
      </nav>
    </div>
  );
}

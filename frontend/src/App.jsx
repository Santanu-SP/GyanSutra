/**
 * App.jsx - Gyan Sutra application root.
 *
 * Layout:
 *   - Sticky header with brand, search, ThemeToggle, Sarathi trigger
 *   - App body shifts right on desktop when Sarathi is open
 *   - SarathiPanel: desktop side panel / mobile bottom sheet (non-blocking)
 *   - Routes: all pages including previously unconnected ones
 *
 * Sarathi state lives here - SarathiPanel is presentation only.
 */

import { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { askQuestion } from './services/api';
import Home from './pages/Home';
import TextReader from './pages/TextReader';
import ThemeToggle from './components/ThemeToggle';
import SarathiPanel from './components/SarathiPanel';
import ErrorBoundary from './components/ErrorBoundary';
import SEOHead from './components/SEO/SEOHead';
import AnimatedButton from './components/AnimatedButton';
import Footer from './components/Footer';
import LanguageSwitcher from './components/LanguageSwitcher';
import useLanguage from './i18n/useLanguage';

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

// Lazy-load heavier pages, then warm their small chunks while the browser is idle.
const routeImports = {
  chapterReader: () => import('./pages/ChapterReader'),
  search: () => import('./pages/Search'),
  verseDetail: () => import('./pages/VerseDetail'),
  ramayana: () => import('./pages/Ramayana'),
  kandaReader: () => import('./pages/KandaReader'),
  faq: () => import('./pages/FAQ'),
  ask: () => import('./pages/Ask'),
};

const ChapterReader = lazyWithRetry(routeImports.chapterReader);
const Search        = lazyWithRetry(routeImports.search);
const VerseDetail   = lazyWithRetry(routeImports.verseDetail);
const Ramayana      = lazyWithRetry(routeImports.ramayana);
const KandaReader   = lazyWithRetry(routeImports.kandaReader);
const FAQ           = lazyWithRetry(routeImports.faq);
const Ask           = lazyWithRetry(routeImports.ask);

// Quiet route loading state for the rare case where an idle preload has not finished.
function PageLoader() {
  const { t } = useLanguage();
  return (
    <div className="gs-route-loader" role="status" aria-live="polite">
      <span className="gs-route-loader__mark" aria-hidden="true" />
      <span>{t('openingPage')}</span>
    </div>
  );
}

// Keep route content fully visible so it does not compete with the boot reveal.
function PageTransition({ children }) {
  return (
    <div className="page-transition-wrapper">
      {children}
    </div>
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
  const { language, t } = useLanguage();
  const [isSarathiOpen, setIsSarathiOpen] = useState(false);
  const [question, setQuestion]           = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [messages, setMessages]           = useState([
    {
      id: 'welcome',
      role: 'sarathi',
      content:
        t('sarathiWelcome'),
    },
  ]);

  useEffect(() => {
    setMessages((current) => current.map((message) => message.id === 'welcome'
      ? { ...message, content: t('sarathiWelcome') }
      : message));
  }, [language, t]);

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

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  // Always begin a new route at the top. Repeat this after the route renders
  // so browser restoration and lazy-loaded content cannot leave it midway down.
  useLayoutEffect(() => {
    const resetScrollPosition = () => {
      window.scrollTo(0, 0);

      const scrollRoot = document.scrollingElement;
      if (scrollRoot) {
        scrollRoot.scrollTop = 0;
        scrollRoot.scrollLeft = 0;
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScrollPosition();
    const animationFrame = window.requestAnimationFrame(resetScrollPosition);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.key]);

  useEffect(() => {
    const warmRouteChunks = () => {
      Object.values(routeImports).forEach((loadRoute) => {
        loadRoute().catch(() => {
          // Navigation still has lazyWithRetry as a recovery path.
        });
      });
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(warmRouteChunks, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(warmRouteChunks, 500);
    return () => window.clearTimeout(timerId);
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
      // Send only prior turns. The current question is already a separate request field.
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-4)
        .map(m => ({ role: m.role, content: m.content }));

      // Preserve the previous source IDs separately from prose. Referential
      // follow-ups such as "explain the second one" can then reuse the exact
      // evidence without another ambiguous vector search.
      const contextIds = [...messages]
        .reverse()
        .find(m => m.role === 'sarathi' && m.citations?.length)
        ?.citations
        .map(citation => citation.id)
        .filter(Boolean)
        .slice(0, 4) || [];

      const result = await askQuestion(trimmed, history, contextIds, language);
      setMessages((cur) => [
        ...cur,
        {
          id: `${Date.now()}-sarathi`,
          role: 'sarathi',
          content: result.answer || t('noAnswer'),
          citations: result.citations || [],
        },
      ]);
    } catch (error) {
      setMessages((cur) => [
        ...cur,
        {
          id: `${Date.now()}-error`,
          role: 'sarathi',
          content: error.message || t('sarathiError'),
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
  const sarathiPrompts = [t('promptDuty'), t('promptDetachment'), t('promptDecision')];

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
              <span className="gs-header__tagline">{t('scriptureLibrary')}</span>
            </span>
          </Link>

          {/* Right Side Elements */}
          <div className="gs-header__right">
            {/* Reading links stay in the desktop header. */}
            <nav className="gs-header__nav-links" aria-label="Primary navigation">
              <span className="gs-header__nav-label">{t('read')}</span>
              <Link to="/bhagavad-gita" aria-current={isGitaRoute ? 'page' : undefined} className={`gs-header__nav-link${isGitaRoute ? ' gs-header__nav-link--active' : ''}`}>{language === 'en' ? 'Bhagavad Gita' : t('heroTitleHighlight')}</Link>
              <Link to="/ramayana" aria-current={isRamayanaRoute ? 'page' : undefined} className={`gs-header__nav-link${isRamayanaRoute ? ' gs-header__nav-link--active' : ''}`}>{t('ramayana')}</Link>
            </nav>

            {/* Utility actions stay in the header on every screen. */}
            <div className="gs-header__actions">
              <Link
                to="/search"
                className="gs-header__search-action"
                aria-label={t('search')}
                aria-current={location.pathname === '/search' ? 'page' : undefined}
                title={t('search')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path strokeLinecap="round" d="M15.5 15.5L21 21" />
                </svg>
              </Link>
              <AnimatedButton
                className="sarathi-trigger"
                onClick={() => setIsSarathiOpen(true)}
                aria-label={t('askSarathi')}
              >
                <TriggerFlame />
                <span className="sarathi-trigger__label">{t('askSarathi')}</span>
              </AnimatedButton>
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ── App body - shifts right on desktop when Sarathi is open ── */}
      <div className={`gs-body${isSarathiOpen ? ' gs-body--sarathi-open' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={`${location.pathname}${location.search}`}>
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
          </Suspense>
        </ErrorBoundary>
        <Footer />
      </div>

      {/* ── Sarathi companion - side panel on desktop, sheet on mobile ── */}
      <SarathiPanel
        isOpen={isSarathiOpen}
        onClose={() => setIsSarathiOpen(false)}
        messages={messages}
        question={question}
        setQuestion={setQuestion}
        onAsk={handleAsk}
        isLoading={isLoading}
        suggestedPrompts={sarathiPrompts}
      />

      {/* ── Mobile bottom navigation: destinations only ───────────── */}
      <nav className="gs-bottom-nav" aria-label="Mobile navigation">
        <Link
          to="/"
          className={`gs-bottom-nav__item${location.pathname === '/' ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label={t('home')}
          aria-current={location.pathname === '/' ? 'page' : undefined}
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-5.25a.75.75 0 00-.75-.75h-6a.75.75 0 00-.75.75V21.75H3.75A.75.75 0 013 21V9.75z" />
          </svg>
          {t('home')}
        </Link>

        <Link
          to="/bhagavad-gita"
          className={`gs-bottom-nav__item${isGitaRoute ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label={t('readGita')}
          aria-current={isGitaRoute ? 'page' : undefined}
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 5.25A2.25 2.25 0 016.75 3H12v16.5H6.75a2.25 2.25 0 00-2.25 1.125V5.25zM19.5 5.25A2.25 2.25 0 0017.25 3H12v16.5h5.25a2.25 2.25 0 012.25 1.125V5.25z" />
          </svg>
          {t('gita')}
        </Link>

        <Link
          to="/ramayana"
          className={`gs-bottom-nav__item${isRamayanaRoute ? ' gs-bottom-nav__item--active' : ''}`}
          aria-label={`${t('read')} ${t('ramayana')}`}
          aria-current={isRamayanaRoute ? 'page' : undefined}
        >
          <svg className="gs-bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12A1.5 1.5 0 0119.5 6v13.5H7.25A2.75 2.75 0 014.5 16.75V6A1.5 1.5 0 016 4.5z" />
            <path strokeLinecap="round" d="M7.25 16.5H19.5M8.5 8h7M8.5 11h5" />
          </svg>
          {t('ramayana')}
        </Link>
      </nav>
    </div>
  );
}

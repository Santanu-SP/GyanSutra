/**
 * App — root layout, routing, and global chrome.
 *
 * Layout: left sidebar (ChapterNav) + main content area on desktop.
 * On mobile: ChapterNav collapses to a horizontal strip at the top.
 */

import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import ChapterNav from './components/ChapterNav';

import Home from './pages/Home';
import ChapterReader from './pages/ChapterReader';
import VerseDetail from './pages/VerseDetail';
import Search from './pages/Search';
import Ask from './pages/Ask';

import './App.css';

export default function App() {
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="app-shell">
      {/* Global top bar */}
      <header className="app-header" role="banner">
        <div className="app-header__brand">
          <NavLink to="/" className="app-header__logo" aria-label="Gyan Sutra home" id="header-logo-link">
            <span className="app-header__logo-devanagari devanagari">ज्ञान</span>
            <span className="app-header__logo-thread" aria-hidden="true">—</span>
            <span className="app-header__logo-en">Gyan Sutra</span>
          </NavLink>
        </div>

        <div className="app-header__center">
          <SearchBar />
        </div>

        <nav className="app-header__nav" aria-label="Main navigation">
          <NavLink
            to="/ask"
            className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}
            id="nav-ask-link"
          >
            Ask
          </NavLink>
          <ThemeToggle />
        </nav>
      </header>

      {/* Mobile chapter strip */}
      <div className="app-chapter-strip" aria-hidden="true">
        <ChapterNav compact />
      </div>

      {/* Body: sidebar + content */}
      <div className="app-body">
        {/* Desktop sidebar chapter nav */}
        <aside className="app-sidebar" aria-label="Chapter navigation">
          <ChapterNav />
        </aside>

        {/* Main content */}
        <div className="app-content">
          <div className="container--prose">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/chapters/:id" element={<ChapterReader />} />
              <Route path="/verses/:id" element={<VerseDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/ask" element={<Ask />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer" role="contentinfo">
        <hr className="gold-rule" />
        <div className="app-footer__inner">
          <span className="devanagari app-footer__logo">ज्ञान सूत्र</span>
          <span className="app-footer__copy">
            All verse content from the Bhagavad Gita, presented for study and reflection.
          </span>
        </div>
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Page not found.</p>
      <NavLink to="/" style={{ color: 'var(--accent)' }}>← Return home</NavLink>
    </div>
  );
}

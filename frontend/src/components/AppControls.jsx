import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import useLanguage from '../i18n/useLanguage';

import './AppControls.css';

const SCALE_KEY = 'gyan-sutra-reading-scale';
const SCALE_STEPS = [0.9, 1, 1.1, 1.2, 1.25];

function readScale() {
  try {
    const saved = Number(window.localStorage.getItem(SCALE_KEY));
    return SCALE_STEPS.includes(saved) ? saved : 1;
  } catch {
    return 1;
  }
}

export default function AppControls() {
  const location = useLocation();
  const { language, setLanguage, languages, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(readScale);
  const closeButtonRef = useRef(null);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--reading-scale', scale);
    document.documentElement.style.setProperty('--reading-scale-inverse', 1 / scale);
    try {
      window.localStorage.setItem(SCALE_KEY, String(scale));
    } catch {
      // The setting still applies for this session if storage is unavailable.
    }
  }, [scale]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const scaleIndex = SCALE_STEPS.indexOf(scale);
  const isDark = theme === 'dark';

  return (
    <>
      <button
        type="button"
        className="app-controls__trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Reading and display settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {isOpen && (
        <div className="app-controls__scrim" onMouseDown={() => setIsOpen(false)}>
          <section
            className="app-controls__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-controls-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="app-controls__handle" aria-hidden="true" />
            <header className="app-controls__header">
              <div>
                <p className="app-controls__eyebrow">Gyan Sutra</p>
                <h2 id="app-controls-title">Reading settings</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="app-controls__close"
                onClick={() => setIsOpen(false)}
                aria-label="Close settings"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            <div className="app-controls__group">
              <div className="app-controls__label-row">
                <div>
                  <span className="app-controls__label">Text size</span>
                  <span className="app-controls__hint">Adjust reading content while navigation stays fixed</span>
                </div>
                <output>{Math.round(scale * 100)}%</output>
              </div>
              <div className="app-controls__stepper" aria-label="Text size controls">
                <button
                  type="button"
                  onClick={() => setScale(SCALE_STEPS[Math.max(0, scaleIndex - 1)])}
                  disabled={scaleIndex === 0}
                  aria-label="Decrease text size"
                >
                  <span aria-hidden="true">A−</span>
                </button>
                <div className="app-controls__scale-track" aria-hidden="true">
                  {SCALE_STEPS.map((step) => (
                    <span key={step} className={step <= scale ? 'is-filled' : ''} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setScale(SCALE_STEPS[Math.min(SCALE_STEPS.length - 1, scaleIndex + 1)])}
                  disabled={scaleIndex === SCALE_STEPS.length - 1}
                  aria-label="Increase text size"
                >
                  <span aria-hidden="true">A+</span>
                </button>
              </div>
            </div>

            <label className="app-controls__row">
              <span className="app-controls__row-icon" aria-hidden="true">文</span>
              <span className="app-controls__row-copy">
                <span className="app-controls__label">{t('changeLanguage')}</span>
                <span className="app-controls__hint">Choose the language used throughout the library</span>
              </span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>{item.nativeName}</option>
                ))}
              </select>
            </label>

            <button type="button" className="app-controls__row" onClick={toggleTheme}>
              <span className="app-controls__row-icon" aria-hidden="true">
                {isDark ? '☀' : '◐'}
              </span>
              <span className="app-controls__row-copy">
                <span className="app-controls__label">Appearance</span>
                <span className="app-controls__hint">{isDark ? 'Switch to light theme' : 'Switch to dark theme'}</span>
              </span>
              <span className={`app-controls__switch${isDark ? ' is-on' : ''}`} aria-hidden="true">
                <span />
              </span>
            </button>
          </section>
        </div>
      )}
    </>
  );
}

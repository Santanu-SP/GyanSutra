/**
 * ThemeToggle — light/dark mode switch.
 * Uses a sun/moon icon pair. No text label needed — icon is self-explanatory.
 */

import { useTheme } from '../hooks/useTheme';
import './ThemeToggle.css';

const SunIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="1" x2="10" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="10" y1="16.5" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="10" x2="3.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16.5" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="3.636" y1="3.636" x2="5.45" y2="5.45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14.55" y1="14.55" x2="16.364" y2="16.364" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="3.636" y1="16.364" x2="5.45" y2="14.55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14.55" y1="5.45" x2="16.364" y2="3.636" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      id="theme-toggle-btn"
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="theme-toggle__icon">{isDark ? <SunIcon /> : <MoonIcon />}</span>
    </button>
  );
}

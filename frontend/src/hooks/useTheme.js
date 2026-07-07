/**
 * useTheme — manages light/dark mode.
 *
 * Priority order:
 *   1. User's manual override (persisted in localStorage)
 *   2. System preference (prefers-color-scheme)
 *
 * Sets data-theme="light"|"dark" on <html> so CSS vars in tokens.css respond.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gyansutra-theme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const resolved = stored || getSystemTheme();
    applyTheme(resolved);
    return resolved;
  });

  // Listen for system preference changes (when no manual override)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const system = getSystemTheme();
        applyTheme(system);
        setThemeState(system);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((newTheme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const resetToSystem = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const system = getSystemTheme();
    applyTheme(system);
    setThemeState(system);
  }, []);

  return { theme, setTheme, toggleTheme, resetToSystem };
}

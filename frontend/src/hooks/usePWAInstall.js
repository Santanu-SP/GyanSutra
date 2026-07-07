/**
 * usePWAInstall — handles the PWA beforeinstallprompt event.
 *
 * The install prompt is intentionally deferred until the user has read a full
 * chapter (see ChapterReader.jsx for the trigger) — not shown on page load.
 *
 * Returns:
 *   canInstall  {boolean} — true if the browser has an installable prompt ready
 *   triggerInstall {() => Promise<void>} — show the native install prompt
 *   dismissed   {boolean} — user dismissed once, don't show again this session
 */

import { useState, useEffect, useCallback } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // Prevent Chrome's default mini-infobar
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'dismissed') setDismissed(true);
    setDeferredPrompt(null);
    setCanInstall(false);
  }, [deferredPrompt]);

  return { canInstall: canInstall && !dismissed, triggerInstall, dismissed };
}

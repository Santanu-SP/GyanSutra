import { useEffect } from 'react';

export default function SplashScreen({ children }) {
  useEffect(() => {
    const splash = document.getElementById('gs-boot-splash');
    if (!splash) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bootStartedAt = window.__gyanSutraBootStartedAt ?? window.performance.now();
    const elapsed = window.performance.now() - bootStartedAt;
    const minimumVisibleTime = prefersReducedMotion ? 0 : 260;
    const exitDuration = prefersReducedMotion ? 80 : 160;
    const exitDelay = Math.max(0, minimumVisibleTime - elapsed);

    let revealFrame;
    let removeTimer;

    // Finish the short brand motion before revealing fully rendered content.
    const exitTimer = window.setTimeout(() => {
      revealFrame = window.requestAnimationFrame(() => {
        if (typeof window.__gyanSutraRevealApp === 'function') {
          window.__gyanSutraRevealApp();
        } else {
          splash.classList.add('is-leaving');
          removeTimer = window.setTimeout(() => splash.remove(), exitDuration);
        }
      });
    }, exitDelay);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
    };
  }, []);

  return children;
}

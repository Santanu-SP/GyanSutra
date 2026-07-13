/**
 * SplashScreen — premium loading experience for Gyan Sutra.
 *
 * Phases:
 *   1. Logo fades in (0–800ms)
 *   2. Name reveals (600–1200ms)
 *   3. Thin gold pulse line (1000ms+)
 *   4. Fade out once minimum time has passed (1400ms)
 *
 * Pure CSS animations — no JS animation library.
 * Respects prefers-reduced-motion.
 */

import { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ children }) {
  const [phase, setPhase] = useState('visible'); // 'visible' | 'fading' | 'done'

  useEffect(() => {
    const minTimer = setTimeout(() => {
      setPhase('fading');
      const fadeTimer = setTimeout(() => setPhase('done'), 500);
      return () => clearTimeout(fadeTimer);
    }, 1400);

    return () => clearTimeout(minTimer);
  }, []);

  return (
    <>
      {phase !== 'done' && (
        <div
          className={`gs-splash${phase === 'fading' ? ' gs-splash--fading' : ''}`}
          role="status"
          aria-label="Loading Gyan Sutra"
        >
          <div className="gs-splash__center">
            <img
              src="/icons/logo.svg"
              alt=""
              className="gs-splash__logo"
              aria-hidden="true"
            />
            <div className="gs-splash__text">
              <span className="gs-splash__name">Gyan Sutra</span>
              <span className="gs-splash__devanagari">ज्ञान सूत्र</span>
            </div>
            <div className="gs-splash__line" aria-hidden="true">
              <div className="gs-splash__line-fill" />
            </div>
          </div>
        </div>
      )}
      <div className={`gs-app-fade${phase === 'done' ? ' gs-app-fade--in' : ''}`}>
        {children}
      </div>
    </>
  );
}

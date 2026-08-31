/**
 * SplashScreen — premium loading experience for Gyan Sutra.
 * Uses framer-motion for a flagship, human-crafted startup animation.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SplashScreen.css';

export default function SplashScreen({ children }) {
  const [shouldAnimateSplash] = useState(
    () => !window.matchMedia('(display-mode: standalone)').matches && sessionStorage.getItem('gyansutra-splash-seen') !== 'true'
  );
  const [showSplash, setShowSplash] = useState(shouldAnimateSplash);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleReduceMotionChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleReduceMotionChange);

    if (!showSplash) return () => mediaQuery.removeEventListener('change', handleReduceMotionChange);

    sessionStorage.setItem('gyansutra-splash-seen', 'true');
    const timer = setTimeout(() => setShowSplash(false), 950);

    return () => {
      mediaQuery.removeEventListener('change', handleReduceMotionChange);
      clearTimeout(timer);
    };
  }, [showSplash]);

  if (prefersReducedMotion) {
    return (
      <div className="gs-app-fade" style={{ opacity: 1 }}>
        {children}
      </div>
    );
  }

  if (!shouldAnimateSplash) {
    return children;
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="gs-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
            transition={{ duration: 0.9, ease: [0.43, 0.13, 0.23, 0.96] }}
          >
            <div className="gs-splash__center">
              <motion.img
                src={`${import.meta.env.BASE_URL}icons/logo.svg`}
                alt=""
                className="gs-splash__logo"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.6, filter: 'blur(12px)', y: 10 }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{ width: '90px', height: '90px', margin: '0 auto' }}
              />

              {/* ── Title: character-by-character stagger ── */}
              <SplashTitle />

              <motion.div
                className="gs-splash__line"
                aria-hidden="true"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '140px' }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
                style={{ originX: 0.5, overflow: 'hidden' }}
              >
                <motion.div
                  className="gs-splash__line-fill"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{
                    duration: 2.2,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatType: 'loop',
                    delay: 1.6,
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="gs-app-fade"
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: showSplash ? 0 : 0.2 }}
      >
        {children}
      </motion.div>
    </>
  );
}

/* ── Character-by-character stagger ───────────────────────────────────── */
const container = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.72,
      staggerChildren: 0.055,
    },
  },
};

const letterVariant = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

// Sub-component for the animated title so the parent stays clean
function SplashTitle() {
  const name = 'GYAN SUTRA';

  return (
    <div className="gs-splash__text">
      {/* English brand name — letter by letter */}
      <motion.span
        className="gs-splash__name"
        variants={container}
        initial="hidden"
        animate="visible"
        aria-label="Gyan Sutra"
        style={{ display: 'flex' }}
      >
        {name.split('').map((char, i) =>
          char === ' ' ? (
            <span key={i} style={{ display: 'inline-block', width: '0.5em' }} aria-hidden="true" />
          ) : (
            <motion.span
              key={i}
              variants={letterVariant}
              style={{ display: 'inline-block', lineHeight: 1 }}
              aria-hidden="true"
            >
              {char}
            </motion.span>
          )
        )}
      </motion.span>

      {/* Devanagari subtitle — fades in as a whole after letters settle */}
      <motion.span
        className="gs-splash__devanagari"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 1.85 }}
      >
        ज्ञान सूत्र
      </motion.span>
    </div>
  );
}

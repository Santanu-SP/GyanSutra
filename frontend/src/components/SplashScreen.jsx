/**
 * SplashScreen — premium loading experience for Gyan Sutra.
 * Uses framer-motion for a flagship, human-crafted startup animation.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SplashScreen.css';

export default function SplashScreen({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleReduceMotionChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleReduceMotionChange);

    // Give it enough time to play the flagship animation (3.2 seconds)
    const timer = setTimeout(() => setShowSplash(false), 3200);

    return () => {
      mediaQuery.removeEventListener('change', handleReduceMotionChange);
      clearTimeout(timer);
    };
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className="gs-app-fade" style={{ opacity: 1 }}>
        {children}
      </div>
    );
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
              <motion.div 
                className="gs-splash__text"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              >
                <span className="gs-splash__name">Gyan Sutra</span>
                <span className="gs-splash__devanagari">ज्ञान सूत्र</span>
              </motion.div>
              <motion.div 
                className="gs-splash__line"
                aria-hidden="true"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "140px" }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 1 }}
                style={{ originX: 0.5, overflow: 'hidden' }}
              >
                <motion.div 
                  className="gs-splash__line-fill"
                  animate={{ 
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2.2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "loop",
                    delay: 1.2
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

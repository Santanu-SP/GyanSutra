import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AnimatedButton — A drop-in replacement for <button>
 * Provides premium Apple/Linear style micro-interactions:
 * - Spring scale on hover/active
 * - Crossfade loading state
 * - On-click subtle pulse feedback
 * - Animated focus ring
 */
export default function AnimatedButton({ 
  children, 
  onClick,
  className = '',
  isLoading = false,
  disabled = false,
  type = 'button',
  ...props 
}) {

  const handleClick = async (e) => {
    if (disabled || isLoading) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      await onClick(e);
    }
  };

  const isDisabled = disabled || isLoading;

  // Remove old utility classes since Framer Motion handles it now
  const cleanClassName = className.replace(/active-press/g, '').replace(/hover-lift/g, '').trim();

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      className={`relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors duration-200 ease-out ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${cleanClassName}`}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <svg className="animate-spin h-4 w-4 opacity-75" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 w-full justify-center h-full"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

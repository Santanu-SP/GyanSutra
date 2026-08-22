import { useEffect, useRef } from 'react';

/**
 * Hook to trigger animations when an element enters the viewport.
 * Respects prefers-reduced-motion (CSS will handle the fallback).
 * 
 * @param {Object} options - IntersectionObserver options
 * @param {boolean} triggerOnce - Whether to only trigger the animation once (default: true)
 * @returns {React.RefObject} - Ref to attach to the element
 */
export function useScrollReveal(options = { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }, triggerOnce = true) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      // Don't apply reveal classes if motion is reduced
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add('reveal-active');
        element.classList.remove('reveal-hidden');
        if (triggerOnce) {
          observer.unobserve(element);
        }
      } else if (!triggerOnce) {
        element.classList.remove('reveal-active');
        element.classList.add('reveal-hidden');
      }
    }, options);

    // Initialize with hidden state
    if (!element.classList.contains('reveal-active')) {
      element.classList.add('reveal-hidden');
    }

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options, triggerOnce]);

  return ref;
}

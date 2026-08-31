import { useEffect } from 'react';

export default function SplashScreen({ children }) {
  useEffect(() => {
    const splash = document.getElementById('gs-boot-splash');
    if (!splash) return undefined;

    // The app is already rendered behind the lightweight boot layer. Keep the
    // brand moment brief, then remove it from the DOM completely.
    const revealTimer = window.setTimeout(() => {
      splash.classList.add('is-leaving');
    }, 520);
    const removeTimer = window.setTimeout(() => {
      splash.remove();
    }, 760);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return children;
}

import { useEffect } from 'react';

export default function SplashScreen({ children }) {
  useEffect(() => {
    const splash = document.getElementById('gs-boot-splash');
    if (!splash) return undefined;

    // The splash only covers bundle startup. Once React is ready, reveal the
    // app on the next frame and remove the layer completely.
    const revealFrame = window.requestAnimationFrame(() => {
      splash.classList.add('is-leaving');
    });
    const removeTimer = window.setTimeout(() => {
      splash.remove();
    }, 220);

    return () => {
      window.cancelAnimationFrame(revealFrame);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return children;
}

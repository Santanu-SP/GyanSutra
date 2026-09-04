import { useEffect, useState } from 'react';
import { getLocalizedVerse } from '../services/api';

const GENERATED_LANGUAGES = new Set(['bn', 'mr', 'te', 'ta']);

function storedContent(verse, language) {
  return verse?.localizedContent?.[language] || verse?.translations?.[language] || null;
}

export default function useLocalizedVerse(verse, language, { enabled = true } = {}) {
  const stored = storedContent(verse, language);
  const shouldGenerate = enabled && Boolean(verse?.id) && GENERATED_LANGUAGES.has(language) && !stored;
  const [state, setState] = useState(() => ({
    content: stored,
    status: stored ? 'ready' : shouldGenerate ? 'loading' : 'idle',
  }));

  useEffect(() => {
    const nextStored = storedContent(verse, language);
    if (nextStored) {
      setState({ content: nextStored, status: 'ready' });
      return undefined;
    }
    if (!enabled || !verse?.id || !GENERATED_LANGUAGES.has(language)) {
      setState({ content: null, status: 'idle' });
      return undefined;
    }

    let active = true;
    setState({ content: null, status: 'loading' });
    getLocalizedVerse(verse.id, language)
      .then((content) => {
        if (active) setState({ content, status: 'ready' });
      })
      .catch(() => {
        if (active) setState({ content: null, status: 'fallback' });
      });

    return () => {
      active = false;
    };
  }, [enabled, language, verse]);

  return state;
}

export { GENERATED_LANGUAGES };

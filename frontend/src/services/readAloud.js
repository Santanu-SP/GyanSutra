import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { fetchNarrationAudio } from './api';
import { createNarrationPlayer } from './narrationPlayer';
import { createRecitationFetcher } from './recitationAudio';

export const startNarrationSession = createNarrationPlayer({
  TextToSpeech, fetchNarrationAudio, Audio: window.Audio,
  fetchRecitationAudio: createRecitationFetcher({
    fetch: window.fetch.bind(window), caches: window.caches,
    online: () => navigator.onLine !== false,
  }),
  online: () => navigator.onLine !== false,
});

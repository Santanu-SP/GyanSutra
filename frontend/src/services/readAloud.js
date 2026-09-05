import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { fetchNarrationAudio } from './api';
import { createNarrationPlayer } from './narrationPlayer';

export const startNarrationSession = createNarrationPlayer({
  TextToSpeech, fetchNarrationAudio, Audio: window.Audio,
  online: () => navigator.onLine !== false,
});

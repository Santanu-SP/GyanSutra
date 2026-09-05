import { deviceVoice } from '../utils/narration.js';

// Speech engines are shared by every card. Only their current owner may stop them.

const abortError = () => new DOMException('Reading stopped', 'AbortError');

export function createNarrationPlayer({ TextToSpeech, fetchNarrationAudio, Audio: AudioElement, online }) {
  let currentSession;
  return function startNarrationSession(onInterrupt) {
    currentSession?.stop();
    const controller = new AbortController();
    const { signal } = controller;
    const audio = new AudioElement();
    audio.preload = 'auto';
    // Unlock HTML audio during the Listen gesture, before any network await.
    audio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';
    const primed = audio.play().catch(() => {});
    let sourceURL;
    const session = {
      signal,
      stop() {
        if (signal.aborted) return;
        controller.abort();
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (sourceURL) URL.revokeObjectURL(sourceURL);
        if (currentSession === session) {
          currentSession = undefined;
          void TextToSpeech.stop().catch(() => {});
        }
        onInterrupt();
      },
      async play(segments, { voices, selectedVoice, rate, onSegment, onFallback }) {
        await primed;
        if (signal.aborted) throw abortError();
        await TextToSpeech.stop().catch(() => {});
        let useNeural = !selectedVoice && online();
        if (!selectedVoice && !useNeural) onFallback();
        let currentVoices = voices;
        // Prepare one segment ahead while the current one plays. Always settle
        // the promise so Stop cannot leave an unhandled fetch rejection.
        const prepare = (segment) => fetchNarrationAudio(segment, signal)
          .then((blob) => ({ blob }), (error) => ({ error }));
        let pending = useNeural && segments.length ? prepare(segments[0]) : null;
        for (let index = 0; index < segments.length; index += 1) {
          const segment = segments[index];
          if (signal.aborted) throw abortError();
          onSegment(segment, index, segments.length, 'preparing');
          let blob;
          if (useNeural) {
            try {
              const result = await pending;
              if (result.error) throw result.error;
              blob = result.blob;
              pending = index + 1 < segments.length ? prepare(segments[index + 1]) : null;
            } catch {
              if (signal.aborted) throw abortError();
              useNeural = false;
              onFallback();
            }
          }
          if (signal.aborted) throw abortError();
          onSegment(segment, index, segments.length, 'playing');
          if (blob) {
            if (sourceURL) URL.revokeObjectURL(sourceURL);
            sourceURL = URL.createObjectURL(blob);
            audio.src = sourceURL;
            audio.playbackRate = rate;
            audio.preservesPitch = true;
            await abortable(new Promise((resolve, reject) => {
              audio.onended = resolve;
              audio.onerror = () => reject(new Error('Audio playback failed'));
              audio.play().catch(reject);
            }), signal);
            audio.onended = null;
            audio.onerror = null;
          } else {
            // Retry enumeration at playback time; web voices often arrive after mount.
            if (!currentVoices.length) {
              const result = await TextToSpeech.getSupportedVoices().catch(() => ({ voices: [] }));
              currentVoices = result.voices;
            }
            if (signal.aborted) throw abortError();
            const voice = deviceVoice(currentVoices, segment.locale,
              segment.kind === 'verse' ? undefined : selectedVoice, online());
            if (!voice) throw new Error('MISSING_VOICE');
            await abortable(TextToSpeech.speak({
              text: segment.text, lang: voice.lang, voice: voice.index,
              rate: segment.kind === 'verse' ? rate * 0.88 : rate,
              pitch: 1, volume: 1, category: 'playback', queueStrategy: 0,
            }), signal);
          }
          if (index < segments.length - 1) await pause(segment.pause / rate, signal);
        }
      },
    };
    currentSession = session;
    return session;
  }

}

function abortable(promise, signal) {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function pause(duration, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const abort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, duration);
    signal.addEventListener('abort', abort, { once: true });
  });
}

# Expressive scripture narration

The app automatically tries this worker through `POST /api/narration`. It uses
[AI4Bharat Indic Parler-TTS](https://huggingface.co/ai4bharat/indic-parler-tts),
an Apache-2.0 model with Sanskrit and all six app languages. Aryan reads Sanskrit;
recommended language-specific speakers explain the meaning. A fixed description
requests measured, reverent recitation and warm, conversational explanations.
The scripture and translations are never rewritten by a language model.

The model is free to run, with no subscription or per-character API charge.
Hosting, electricity and hardware are separate. This is a 0.9B parameter model,
not a small Android voice library. Initial model downloads require several GB.
Use a GPU for interactive generation; CPU generation can exceed the app's
90-second request timeout. Cached readings avoid repeated synthesis. This does
not guarantee human emotion, correct Vedic chanting, or flawless pronunciation:
review generated scripture audio with a fluent speaker before public release.

## Start locally

Use Python 3.11 in an isolated environment (the upstream stack pins Transformers
4.46.1 and has older audio dependencies). From this directory:

```sh
python3.11 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 1
```

Startup downloads and loads the model before accepting requests. Test readiness
with `curl http://127.0.0.1:8001/health`. Then set this in `backend/.env` and restart
the Node backend:

```dotenv
NARRATION_SERVICE_URL=http://127.0.0.1:8001
```

The frontend uses its existing `VITE_API_BASE_URL`; Android requires a reachable
HTTPS Node backend. A worker on your laptop is not reachable from the deployed
backend until you configure hosting/networking. No model or secret goes in the APK.

For a private remote worker, set `NARRATION_SERVICE_TOKEN` to the same secret in
both services, use HTTPS, and restrict access to the Node backend. Keep one worker
per model/GPU. Never expose an unauthenticated worker to the public internet.
`NARRATION_DEVICE` optionally selects a PyTorch device; default is CUDA if present,
otherwise CPU. `NARRATION_CACHE_DIR` sets the disk cache directory (512 MiB limit).

## Playback and failure behavior

- Danda and line boundaries create short breath pauses; section changes get a
  longer pause. The order is verse → meaning → optional explanation → context.
- Markdown formatting and verse reference numbers are omitted from speech.
- One segment is prepared ahead; WAV output is cached on the worker and in a
  bounded Node memory cache. The client does not persist scripture audio.
- Stop, navigation, language/content changes and a new reading cancel the current
  session. A worker already generating may finish and cache the cancelled segment.
- If the worker is unconfigured, unavailable, busy or too slow, playback explicitly
  reports device-voice fallback and continues from the current segment.
- Device fallback prefers available natural/enhanced voices, then locale matches.
  Sanskrit falls back to Hindi only when a Sanskrit device voice is absent. This
  fallback can mispronounce Sanskrit. Missing voices produce an installation
  prompt on Android instead of silently skipping the verse.
- Choosing a named device voice bypasses the neural worker for that reading.

## Verification

```sh
curl -f http://127.0.0.1:8001/synthesize \
  -H 'Content-Type: application/json' \
  -d '{"text":"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।","locale":"sa-IN","style":"recitation"}' \
  --output /tmp/gyansutra-recitation.wav
```

Listen to Sanskrit and each supported meaning language on actual target devices.
Check Stop during preparation, Stop mid-sentence, a second verse taking over,
offline playback and switching language mid-reading. Automated tests cover
script ordering, voice selection, cancellation and the API contract; they cannot
verify emotion or pronunciation.

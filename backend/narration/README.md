# Read-aloud: human recitation and device meanings

## Current default — no voice server required

Gita readings play Rohan's human Sanskrit recording for the selected verse,
pause, then read the displayed meaning with the best available device voice.
The optional explanation and context follow in that order. Choosing a meaning
voice changes prose narration; it does not replace the human Sanskrit recording.
Recordings are played as complete, unedited files, never mixed into a new file.

The inventory covers **701 verses across 18 chapters**, matching this app's
35-verse chapter 13 numbering. All 701 mapped filenames were checked against
the pinned upstream Git tree. Space-containing filenames have explicit mappings.
This verifies file coverage; it is not a listening review of all 701 recordings.

- Creator: **Rohan**, credited by the Bhagavad Gita / GitaGuru project.
- [Source and attribution](https://github.com/bhagavdgita/bhagavdgita.github.io/tree/1c5a5105c2e52438fa3c4dfe8727c5abf53233f4)
- [Audio-specific license notice](https://github.com/bhagavdgita/bhagavdgita.github.io/blob/1c5a5105c2e52438fa3c4dfe8727c5abf53233f4/audio/README.md)
- Audio license: [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/).
  These recordings are for the current noncommercial app. Commercial or ad-funded
  use requires a different recording source or permission from the rights holder.
  The source's MIT code license does not license its audio. Attribution and the
  audio license are visible beside Listen.

Recordings are fetched directly from the pinned public GitHub source on first
play, with no API key or Python worker. The browser/Android webview caches up to
32 recent recordings for offline reuse where Cache Storage is available. Each
download is limited to 4 MiB and 12 seconds. Storage can be evicted by the device,
so offline availability is not permanent. Cached files stay byte-for-byte intact.
Download failure falls back to device Sanskrit/Hindi narration; playback failure
stops with an error so a partially heard verse is not unexpectedly repeated.

Ramayana verse readings still use device narration. The openly shared
[V. Sriram / Harisitaramamurti collection](https://archive.org/details/Ramayana-recitation-Sriram-harisItArAmamUrti-Ghanapaati-v2)
is linked from Ramayana Listen controls for human recitation by sarga.
Its tracks are chapter-length and use a Gita Press-based text; verified timings
for this app's individual verses are not available. It is not silently substituted
for a single selected verse. The [project page](https://sanskrit.github.io/groups/dyuganga/projects/audio/ramayana-audio/)
describes its CC BY-SA 4.0 publication approach.

The default reader **does not call `/api/narration`**. Existing Render hosting
needs no extra memory, voice service, paid account, or model download for this mode.

## Other options researched (2026-09-05)

| Option | Useful improvement | Remaining constraint |
| --- | --- | --- |
| [Gemini 2.5 Flash Preview TTS](https://ai.google.dev/gemini-api/docs/pricing) | Expressive meaning narration with a listed Developer API free tier; Render can call the API | Preview quotas and project eligibility; paid-tier keys can incur charges. Not enabled by this change. |
| Generate audio ahead of time | Generate each stable translation once, review it, and serve cached files without continuous model hosting | Requires generation compute and storage initially; regenerate when the text or translation changes. |
| [Vāgdhenu](https://huggingface.co/prathoshap/vagdhenu) | Sanskrit-specific chant model, worth evaluating for verse recordings absent from human collections | Needs generation compute, metrical/reference preparation and pronunciation review; not a free hosted production API. |
| [Google Cloud Chirp 3 HD](https://cloud.google.com/text-to-speech/pricing) | Natural meaning voices with a published monthly free allowance | Billing must be enabled and overages are charged; not an unconditional zero-cost option. |

Gemini's [speech documentation](https://ai.google.dev/gemini-api/docs/speech-generation)
lists the app's six meaning languages. Sanskrit is not listed, so it should not
replace authentic Sanskrit recitation without separate evaluation. The next
worthwhile experiment is a small, quota-limited set of pregenerated meanings,
with the exact displayed text and audio reviewed together. API free-tier access
has not been tested against this app's account, and no paid API was activated.

## Optional Indic Parler worker — retained, not used by default

The existing `POST /api/narration` integration is available for a future explicitly
selected neural mode (`mode: 'neural'` in the playback service). It uses
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

## Optional neural playback and failure behavior

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

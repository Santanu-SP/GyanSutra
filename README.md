# ज्ञान सूत्र - Gyan Sutra

> **A bridge of code to the eternal wisdom of the Bhagavad Gita and Valmiki Ramayana.**

Gyan Sutra is an open-source, highly extensible digital scripture engine. The platform is architected with a unified schema that treats Sanskrit shlokas, multi-lingual translations, and commentaries as first-class, structured nodes. This layout allows any new holy texts, epics, or commentary streams to be ingested directly into the database without requiring any changes to the frontend.

Gyan Sutra features chapter-by-chapter reading, semantic/neural search, recommendation rails based on embedding cosine similarity, and an AI-driven spiritual guide called **Sarathi (सारथि)** that answers natural-language reflections using strict retrieval-grounded generation (RAG) with verifiable citations.

Read-aloud follows the shloka, meaning, and optional explanation/context with
breath pauses and language-aware voice selection. For expressive, free-to-run
Indic Parler-TTS voices, configure the separate
[narration worker](backend/narration/README.md). Without that worker, the app
uses available device voices and reports the fallback.

---

## 🛠️ System Architecture

```
┌─ Cloudflare Pages ──────────────┐   ┌─ GitHub Pages ──────────────────┐
│  https://gyansutraapp.pages.dev │   │  https://santanu-sp.github.io/  │
│  (React + Vite PWA, base='/')   │   │  GyanSutra/                     │
│  Primary / LinkedIn Featured    │   │  (same build, base='/GyanSutra/')│
└────────────────┬────────────────┘   └──────────────┬──────────────────┘
                 │                                    │
                 └──────────────┬─────────────────────┘
                                ▼ (HTTPS REST)
                  Render.com (Node/Express API - Free Tier)
                    ├── Firestore DB (Spark/Free)
                    │     └── Collections: 'chapters', 'verses' (Vector Index)
                    ├── Local Transformer (ONNX 'gte-small' 384-dim Embeddings)
                    └── Bounded AI routing (Gemini → Groq → OpenRouter)
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v22 or higher)
- A **Firebase/Firestore** project in Native mode with Email Auth enabled.
- A **Google AI Studio API Key** for the configured stable Gemini Flash model.

### 1. Backend Configuration
Navigate to the backend directory, clone the template, and populate it with your credentials:
```bash
cd backend
cp .env.example .env
# Open .env and set:
# - FIREBASE_PROJECT_ID
# - FIREBASE_SERVICE_ACCOUNT_PATH (pointing to your serviceAccountKey.json)
# - GEMINI_API_KEY (Your official Google AI Studio API Key)
npm install
```

### 2. Firestore Vector Index Configuration
To enable semantic search and recommendation rails, configure a vector index in the Firebase Console:
- **Collection**: `verses`
- **Field Path**: `embedding`
- **Dimension**: `384`
- **Distance Measure**: `COSINE`

### 3. Data Ingestion
To populate the database with the Bhagavad Gita and Valmiki Ramayana:

```bash
# Ingest Chapter Blueprints & the Gita dataset:
npm run ingest

# Ingest the Ramayana dataset (normalizes and merges raw text with Itihasa translations):
node scripts/ingest_ramayana.js
```
*Flags:*
- `--dry-run` : Runs the pipeline without writing to Firestore.
- `--skip-embed` : Ingests text data but skips embedding calls (fills vectors with 0s).

### 4. Running the Dev Environment
```bash
# Start backend API (runs on port 3001)
cd backend && npm start

# Start frontend application (runs on port 5173)
cd frontend && npm run dev
```

### 5. Android Application

The Android app uses Capacitor and shares the React interface with the website. Its native project is isolated in `frontend/android`, so normal web builds and deployments are unchanged.

```bash
cd frontend
npm run android:sync
npm run android:open
```

See [`frontend/ANDROID.md`](frontend/ANDROID.md) for setup, testing, signing, versioning, and release instructions.

### Sarathi reliability and usage limits

Sarathi is designed to remain useful when an external model is slow, rate-limited,
or unavailable:

- Exact verse requests bypass embeddings and vector search.
- Low-confidence retrieval does not spend model credits.
- First-turn answers, embeddings, and retrieval results use bounded exact caches.
- Only two model attempts are allowed by default, across independent providers.
- Per-model timeouts, an overall deadline, a concurrency cap, and temporary
  provider circuit breakers prevent quota cascades.
- Generated verse references are validated against retrieved source IDs. Invalid
  model citations are replaced with a safe extractive response.
- When generation fails, Sarathi returns the retrieved translations and citations
  instead of exposing a provider error.

The defaults are documented in `backend/.env.example`. Increment
`RAG_CORPUS_VERSION` whenever scripture data or stored embeddings are re-ingested.

---

## 📂 Project Structure

```
GyanSutra/
├── .github/
│   └── workflows/
│       └── deploy-github-pages.yml  # Auto-deploy to GitHub Pages on push to main
│
├── backend/
│   ├── data/
│   │   ├── gita.json                # Enriched Gita dataset (700 verses, commentaries, translations)
│   │   └── raw/                     # Raw ingestion source files (git-ignored, local dev only)
│   │       ├── Valmiki_Ramayan_Dataset/  # Sanskrit shlokas source
│   │       └── itihasa/                 # M.N. Dutt English translations source
│   ├── models/
│   │   └── Xenova/gte-small/        # Local ONNX embedding model (384-dim) - required at runtime
│   ├── scripts/
│   │   ├── ingest.js                # Ingests Bhagavad Gita into Firestore with embeddings
│   │   ├── ingest_ramayana.js       # Ingests Valmiki Ramayana into Firestore with embeddings
│   │   └── enrich_gita_data.js      # Downloads and merges Guru commentaries into gita.json
│   ├── src/
│   │   ├── app.js                   # Express API bootstrap - CORS, rate limiting, route registration
│   │   ├── server.js                # HTTP lifecycle and background embedding prewarm
│   │   ├── data/
│   │   │   └── sources.js           # Static source registry (Gita, Ramayana, Upanishads)
│   │   ├── routes/
│   │   │   ├── ask.js               # POST /api/ask - Sarathi RAG endpoint
│   │   │   ├── chapters.js          # GET /api/chapters - chapter metadata
│   │   │   ├── recommendations.js   # GET /api/recommendations - cosine-similar verse rail
│   │   │   ├── search.js            # GET /api/search - semantic + keyword search
│   │   │   ├── sources.js           # GET /api/sources - scripture source list
│   │   │   └── verses.js            # GET /api/verses - verse fetch by ID/chapter/kanda
│   │   └── services/
│   │       ├── cache.js             # Bounded TTL/LRU caches and concurrent-request coalescing
│   │       ├── embedding.js         # Local Xenova/transformers ONNX embedding pipeline
│   │       ├── firestore.js         # Firestore server client + KNN vector search
│   │       ├── ragUtils.js          # Reference parsing, reranking, and grounding validation
│   │       └── rag.js               # Bounded retrieve → validate → generate/fallback pipeline
│   ├── .env.example                 # Environment variable template (copy to .env)
│   ├── .gitignore
│   ├── package.json
│   └── render.yaml                  # Render.com deployment config
│
└── frontend/
    ├── public/
    │   ├── icons/                   # PWA icons (192px, 512px, apple-touch, favicon)
    │   ├── linkedin/                # OG/social preview image
    │   ├── 404.html                 # GitHub Pages SPA shim (redirects unknown routes)
    │   ├── icons.svg                # Sprite sheet for inline SVG icons
    │   └── manifest.json            # PWA web app manifest
    ├── src/
    │   ├── design-system/
    │   │   └── tokens.css           # CSS custom properties - the entire visual design system
    │   ├── components/
    │   │   ├── AskPanel.(jsx|css)           # Standalone Ask panel (see Developer Notes)
    │   │   ├── ChapterNav.(jsx|css)         # Chapter navigation sidebar
    │   │   ├── ErrorBoundary.jsx            # React error boundary
    │   │   ├── IlluminatedVerseCard.(jsx|css) # Signature gold-bordered shloka renderer
    │   │   ├── LoadingSpinner.(jsx|css)     # Reusable loading state
    │   │   ├── RecommendationsRail.(jsx|css)# Related verse horizontal rail
    │   │   ├── SarathiPanel.(jsx|css)       # Sarathi bottom-sheet/sidebar AI companion
    │   │   ├── SearchBar.(jsx|css)          # Global keyboard-shortcut search
    │   │   ├── SplashScreen.(jsx|css)       # First-load animated splash
    │   │   └── ThemeToggle.(jsx|css)        # Light/dark theme toggle
    │   ├── hooks/
    │   │   ├── usePWAInstall.js     # PWA install prompt hook
    │   │   └── useTheme.js          # Theme persistence (localStorage + CSS attribute)
    │   ├── pages/
    │   │   ├── Ask.(jsx|css)        # Ask page (see Developer Notes - currently no route)
    │   │   ├── ChapterReader.(jsx|css) # Chapter-by-chapter Gita reader
    │   │   ├── Home.jsx             # Landing page with daily verse + entry points
    │   │   ├── KandaReader.jsx      # Ramayana kanda reader
    │   │   ├── Ramayana.jsx         # Ramayana kanda index
    │   │   ├── Search.(jsx|css)     # Full-page semantic search
    │   │   ├── TextReader.(jsx|css) # Source overview page (chapters list)
    │   │   └── VerseDetail.(jsx|css)# Individual verse detail page
    │   ├── services/
    │   │   └── api.js               # All fetch calls to the Express backend
    │   ├── utils/
    │   │   └── verseUtils.js        # Verse ID parsing helpers
    │   ├── App.jsx                  # App root - routing, Sarathi state, header
    │   ├── app.css                  # Global layout styles
    │   ├── index.css                # Base reset + typography
    │   └── main.jsx                 # React entry point - PWA registration
    ├── dist/                        # ⚡ Generated by `npm run build` - do not commit (git-ignored)
    ├── index.html                   # App shell - meta tags, OG, PWA, SPA theme init
    ├── vite.config.js               # Vite config - PWA plugin, Tailwind, base path
    ├── .env.example                 # Frontend env variable template
    └── package.json
```

---

## 🗒️ Developer Notes

### Ask.jsx / AskPanel.jsx - Standalone Page
`src/pages/Ask.jsx` and `src/components/AskPanel.jsx` provide the dedicated `/ask`
experience. The global `SarathiPanel` uses the same backend while keeping a short
conversation and exact citation IDs for grounded follow-up questions.

### gita.json - The Active Dataset
`backend/data/gita.json` (≈30 MB) is the enriched, production-ready Gita dataset used by `scripts/ingest.js`. It was generated by running `scripts/enrich_gita_data.js` which pulls Guru commentaries from the open-source `gita/gita` GitHub repository and merges them with the base verse records.

### Local Embedding Model
`backend/models/Xenova/gte-small/` contains the ONNX model binaries for the `gte-small` transformer (384-dimensional embeddings). These are committed to the repository intentionally to avoid Hugging Face download failures on Render's cloud hosting (which blocks HuggingFace requests from certain IP ranges). The server begins loading the model in the background after its health endpoint is available; a first request can safely share that same in-progress load.

## 🪵 The Developer's Journal: Behind the Scenes & Hurdles

Building a platform for ancient scriptures was not just a coding exercise-it was a battle of data wrangling, prompt tuning, and hardware/performance optimizations. Here is the honest record of the difficulties faced and how they were overcome.

### 1. The Bhagavad Gita Dataset Nightmare
The Bhagavad Gita might be short (700 verses), but finding clean, structured, and complete data was incredibly painful.
* **Fragmented Repositories**: The Sanskrit texts were in one database, the English translations in another, and the commentaries in a third.
* **The API Enrichment Pipeline**: We had to write a custom script (`enrich_gita_data.js`) that fetched global metadata (`verse.json`) and raw commentary pools (`commentary.json`) from GitHub. We then had to manually map commentaries back to each verse via a calculated composite key (`chapter-verse`). We chose Swami Sivananda’s English commentary and Swami Chinmayananda’s Hindi commentary as our defaults.
* **The Weird Delimiter Quirk**: The raw word-meanings in the repository were concatenated into long strings delimited by **question marks (`?`)** and arbitrary spaces instead of clean arrays. Our parser had to split the string by `?`, split again by space, strip out non-Devanagari characters, and throw away corrupted elements (like stray commentary notes that had sneaked into the vocabulary list) to create the clean word-meaning JSON schema.

### 2. Ramayana Data Matching & Text Normalization
The Ramayana is massive (~24,000 shlokas), and matching the verses across datasets was a major bottleneck.
* **Varying Sanskrit Styles**: We combined the `Valmiki_Ramayan_Dataset` (which had excellent Sanskrit texts) with the `itihasa` dataset (which had M.N. Dutt's English translations). However, the Sanskrit shlokas didn't match directly because different editors had used different punctuation (e.g., `।` vs `॥` vs `|`), varying whitespaces, or soft vowels.
* **Normalization Logic**: We had to write a strict regex-based normalization function (`normalizeSanskrit()`) that stripped all spaces, line-breaks, Devanagari numerals, and punctuation. The resulting raw character string served as our unique hash key to match and backfill English prose translations.

### 3. Cloud Deployment vs. Local Transformers
We wanted our vector embeddings to be **100% free and offline**, so the backend runs `gte-small` locally with the maintained `@huggingface/transformers` package.
* **403 Forbidden Errors**: Deploying to production resulted in Hugging Face blocking model download requests originating from cloud hosting IP ranges.
* **The Fix**: We downloaded the `gte-small` model binaries locally and committed them to the repository inside `backend/models`. We then forced `env.allowRemoteModels = false` in code so the model would always be loaded strictly from local memory.
* **Memory Limits**: Since Render's free tier is memory constrained, the ONNX pipeline loads lazily and concurrent first requests share the same model initialization.

### 4. OpenRouter Free Tier Glitches & Latency
When launching the RAG pipeline, we initially relied on `Llama-3.3-70b-instruct:free` via OpenRouter.
* **The Timeout Glitch**: Heavy rate-limiting on OpenRouter's free tier for 70B models caused severe latency (>50 seconds) and cascading timeouts. This forced the system to fall back to smaller models which hallucinated on follow-up questions.
* **The Fix**: The pipeline now prioritizes a stable **Google Gemini Flash** model, limits hidden reasoning effort and output tokens, and uses at most one independent provider fallback. Strict grounding validation and an extractive source fallback keep the user response useful even when every model quota is unavailable.

### 5. Mobile UX Overhaul: Reclaiming the Scripture
The **Sarathi** chat UI was designed as a sliding bottom sheet on mobile screens. 
* **The Viewport Clutter**: It had a `70dvh` height and a dark, blurred background overlay (`.sarathi-backdrop`). When a user opened Sarathi to reflect on a verse, they couldn't even see the verse card behind the sheet to verify what they were discussing.
* **The Fix**: We removed the backdrop blur/darkening to make it transparent, and capped the sheet's mobile height at `55dvh`. Now, the scripture is perfectly visible at the top of the mobile screen.
* **The Scroll Hijack**: The app automatically scrolled the viewport to the very bottom of the chat list on new messages. When Sarathi returned a long response, this pushed the start of the message off-screen. We wrote a custom DOM query inside the scroll `useEffect` that locates the *top* of the newly generated message and scrolls *that* to the top of the viewport, eliminating scroll fatigue.

---

## 🚀 Deployment Guide

Gyan Sutra is deployed to **two free hosts simultaneously** from the same Git repository:

| Host | URL | Base path | Use |
|------|-----|-----------|-----|
| Cloudflare Pages | `https://gyansutraapp.pages.dev/` | `/` | Primary / LinkedIn |
| GitHub Pages | `https://santanu-sp.github.io/GyanSutra/` | `/GyanSutra/` | Secondary / free CDN |

Both deployments connect to the **same Render backend** - no backend changes are needed.

---

### Cloudflare Pages (existing - no changes needed)

Cloudflare is already configured and will continue to build automatically on every push to `main`. It builds with the default `base='/'` because `VITE_BASE_PATH` is not set in its environment.

> **Build command:** `npm run build` (in `frontend/`)
> **Output directory:** `frontend/dist`

---

### GitHub Pages Setup (one-time steps)

#### Step 1 - Add the backend URL secret

1. Go to your repository on GitHub.
2. Navigate to **Settings → Secrets and variables → Actions → New repository secret**.
3. Create a secret:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://<your-service>.onrender.com` (your Render backend URL, no trailing slash)
4. Click **Add secret**.

> ⚠️ Never put the actual URL directly in the workflow file. Always use the secret reference `${{ secrets.VITE_API_BASE_URL }}`.

#### Step 2 - Enable GitHub Pages

1. Go to **Settings → Pages**.
2. Under **Source**, select **GitHub Actions**.
3. Click **Save**.

The workflow file is at `.github/workflows/deploy-github-pages.yml` and runs automatically on every push to `main`.

#### Step 3 - Push and verify

After enabling Pages and adding the secret, push any commit to `main`. The **Actions** tab will show the `Deploy to GitHub Pages` workflow running. Once complete, the site is live at:

```
https://santanu-sp.github.io/GyanSutra/
```

---

### How both deployments work from the same source

Vite's `base` config controls how asset URLs are emitted. The GitHub Actions workflow sets `VITE_BASE_PATH=/GyanSutra/` at build time so all asset paths are prefixed correctly for the GitHub Pages sub-path. Cloudflare builds without this variable (defaults to `/`).

**React Router deep links on GitHub Pages** are handled by a two-step SPA shim:
1. `public/404.html` - GitHub Pages serves this for any unmatched route. It saves the real path to `sessionStorage` and redirects to the app root.
2. The restore script in `index.html` - runs before React boots, reads `sessionStorage`, and calls `history.replaceState()` with the original path. React Router then sees the correct URL.

---

### Testing both deployments

```bash
# Test Cloudflare (primary)
open https://gyansutraapp.pages.dev/
open https://gyansutraapp.pages.dev/chapters/1          # Deep link
open https://gyansutraapp.pages.dev/ramayana            # Deep link

# Test GitHub Pages (secondary)
open https://santanu-sp.github.io/GyanSutra/
open https://santanu-sp.github.io/GyanSutra/chapters/1  # Deep link - must not 404
open https://santanu-sp.github.io/GyanSutra/ramayana    # Deep link - must not 404

# Validate LinkedIn / OG metadata
# Visit: https://www.linkedin.com/post-inspector/
# Enter the GitHub Pages URL and check og:title, og:image, og:description
```

---

## 📄 License
This project is licensed under the MIT License. Scriptural verse content is sourced from open-access Sanskrit databases.

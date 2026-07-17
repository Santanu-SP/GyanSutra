# ज्ञान सूत्र — Gyan Sutra

> **A bridge of code to the eternal wisdom of the Bhagavad Gita and Valmiki Ramayana.**

Gyan Sutra is an open-source, highly extensible digital scripture engine. The platform is architected with a unified schema that treats Sanskrit shlokas, multi-lingual translations, and commentaries as first-class, structured nodes. This layout allows any new holy texts, epics, or commentary streams to be ingested directly into the database without requiring any changes to the frontend.

Gyan Sutra features chapter-by-chapter reading, semantic/neural search, recommendation rails based on embedding cosine similarity, and an AI-driven spiritual guide called **Saarthi (सारथी)** that answers natural-language reflections using strict retrieval-grounded generation (RAG) with verifiable citations.

---

## 🛠️ System Architecture

```
Cloudflare Pages (React + Vite PWA)
        │
        ▼ (HTTPS REST)
  Render.com (Node/Express API — Free Tier)
    ├── Firestore DB (Spark/Free)
    │     └── Collections: 'chapters', 'verses' (with Vector Index)
    ├── Local Transformer (ONNX 'gte-small' 384-dim Embeddings)
    └── OpenRouter API (Smart Model Routing)
```

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Node.js** (v18 or higher recommended)
- A **Firebase/Firestore** project in Native mode with Email Auth enabled.
- An **OpenRouter API Key** (for querying Llama-3.3-70b-instruct).

### 1. Backend Configuration
Navigate to the backend directory, clone the template, and populate it with your credentials:
```bash
cd backend
cp .env.example .env
# Open .env and set:
# - FIREBASE_PROJECT_ID
# - FIREBASE_SERVICE_ACCOUNT_PATH (pointing to your serviceAccountKey.json)
# - GEMINI_API_KEY (Your OpenRouter API Key)
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

---

## 📂 Project Structure

```
GyanSutra/
├── backend/
│   ├── data/                 # Raw datasets (gita.json, Ramayana resources)
│   ├── scripts/              # Dataset merging, cleaning, and ingestion pipelines
│   ├── src/
│   │   ├── app.js            # Express API bootstrap
│   │   ├── routes/           # REST endpoints (auth, chapter read, search, ask RAG)
│   │   └── services/
│   │       ├── firestore.js  # Admin SDK wrapper & vector search logic
│   │       ├── embedding.js  # Local Xenova/transformers ONNX embedding loader
│   │       └── rag.js        # RAG pipeline with cosine threshold gate
│   └── models/               # Locally stored Xenova GTE embedding model binaries
│
└── frontend/
    ├── src/
    │   ├── design-system/    # CSS custom properties (tokens.css) — the visual design system
    │   ├── components/
    │   │   ├── IlluminatedVerseCard.jsx # Signature gold-bordered shloka render engine
    │   │   ├── SaarthiPanel.jsx         # Bottom-sheet/sidebar reflection interface
    │   │   └── ...
    │   └── pages/            # Home, Search, Reader, and Auth views
```

---

## 🪵 The Developer's Journal: Behind the Scenes & Hurdles

Building a platform for ancient scriptures was not just a coding exercise—it was a battle of data wrangling, prompt tuning, and hardware/performance optimizations. Here is the honest record of the difficulties faced and how they were overcome.

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
We wanted our vector embeddings to be **100% free and offline**, so we chose the `@xenova/transformers` library (running `gte-small` locally). This worked beautifully on a local machine, but crashed immediately on Render.com's free tier.
* **403 Forbidden Errors**: Deploying to production resulted in Hugging Face blocking model download requests originating from cloud hosting IP ranges.
* **The Fix**: We downloaded the `gte-small` model binaries locally and committed them to the repository inside `backend/models`. We then forced `env.allowRemoteModels = false` in code so the model would always be loaded strictly from local memory.
* **Memory Limits**: Since Render's free tier is limited to 512MB RAM, loading even a small transformer model alongside Express and Firebase Admin required fine-grained garbage collection and lazy-loading of the ONNX pipeline instance.

### 4. OpenRouter Free Tier Glitches & Multilingual Hallucinations
When launching the RAG pipeline, we initially routed queries through a wildcard `openrouter/free` endpoint.
* **The Tamasic Food Glitch**: A natural-language query asking *"Is tamasic food good in any way according to Gita"* returned a chaotic, corrupted response. The free-tier router had assigned a low-tier model that could not comprehend regional script requests, leading it to hallucinate a garbled mix of Hindi, Marathi, and random characters (like `dijo`, `へぇ`, and Arabic words).
* **The Fix**: We overrode the wildcard router and locked the pipeline to **Llama-3.3-70b-instruct:free**. This model has top-tier multilingual capabilities, ensuring answers are returned in pure, eloquent English (or Devanagari Hindi if requested).

### 5. Mobile UX Overhaul: Reclaiming the Scripture
The **Saarthi** chat UI was designed as a sliding bottom sheet on mobile screens. 
* **The Viewport Clutter**: It had a `70dvh` height and a dark, blurred background overlay (`.saarthi-backdrop`). When a user opened Saarthi to reflect on a verse, they couldn't even see the verse card behind the sheet to verify what they were discussing.
* **The Fix**: We removed the backdrop blur/darkening to make it transparent, and capped the sheet's mobile height at `55dvh`. Now, the scripture is perfectly visible at the top of the mobile screen.
* **The Scroll Hijack**: The app automatically scrolled the viewport to the very bottom of the chat list on new messages. When Saarthi returned a long response, this pushed the start of the message off-screen. We wrote a custom DOM query inside the scroll `useEffect` that locates the *top* of the newly generated message and scrolls *that* to the top of the viewport, eliminating scroll fatigue.

---

## 📄 License
This project is licensed under the MIT License. Scriptural verse content is sourced from open-access Sanskrit databases.
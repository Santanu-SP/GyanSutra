# ज्ञान सूत्र — Gyan Sutra

> *Thread of knowledge from the Bhagavad Gita*

A production-grade scripture knowledge platform. Read the Bhagavad Gita verse by verse in Sanskrit, Hindi, and English. Ask questions that are answered only from the text — with citations — never from the model's general knowledge.

---

## Architecture

```
Cloudflare Pages (React + Vite PWA)
        │  HTTPS
        ▼
  Render.com (Express API — free tier)
     │              │
     ▼              ▼
Firestore         Google AI Studio
(Spark/free)      Gemini embeddings + Flash generation
     │
Firebase Auth (Spark/free)
```

### The one rule that doesn't bend

`POST /api/ask` embeds your question, retrieves the nearest verses, and checks: is the top cosine similarity ≥ 0.72? If **no** — the function returns a clean refusal and **the LLM is never called**. This is enforced in code (`backend/src/services/rag.js`), not in a prompt.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A Firebase project (Spark/free) with Firestore Native mode + Auth enabled
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free, no card)

### 1. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in: FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_PATH, GEMINI_API_KEY
npm install
```

### 2. Firestore vector index

In Firebase Console → Firestore → Indexes → Vector indexes:
- Collection: `verses`
- Field: `embedding`
- Dimension: `768`
- Distance measure: `COSINE`

### 3. Data ingestion

The bundled dataset contains representative verses from all 18 chapters:

```bash
npm run ingest
```

For the full ~700-verse dataset:
```bash
# Download the open-licensed gita-api dataset
curl -L https://raw.githubusercontent.com/gita/BhagavadGita/master/data/bhagavad_gita.json \
  -o data/gita.json
npm run ingest
```

Flags:
- `--dry-run` — validate without writing to Firestore
- `--skip-embed` — write text data only, skip embedding API calls

### 4. Run

```bash
# Backend
cd backend && npm start          # :3001

# Frontend
cd frontend && npm run dev       # :5173
```

---

## Project Structure

```
GyanSutra/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point
│   │   ├── routes/             # 6 API routes
│   │   └── services/
│   │       ├── firestore.js    # Admin SDK + findNearest KNN
│   │       ├── embedding.js    # Gemini embedding calls
│   │       └── rag.js          # Retrieve → threshold gate → generate
│   ├── scripts/
│   │   └── ingest.js           # One-time data ingestion
│   └── render.yaml
│
└── frontend/
    ├── src/
    │   ├── design-system/tokens.css  # All CSS vars — source of truth
    │   ├── components/
    │   │   ├── IlluminatedVerseCard  # The visual signature
    │   │   ├── ChapterNav            # Book-edge tab strip
    │   │   ├── AskPanel              # RAG Q&A interface
    │   │   └── RecommendationsRail   # Embedding-similarity suggestions
    │   └── pages/
    │       ├── Home.jsx              # Today's verse
    │       ├── ChapterReader.jsx     # Verse-by-verse with page-turn
    │       ├── VerseDetail.jsx
    │       ├── Search.jsx            # Semantic search
    │       └── Ask.jsx               # AI Q&A
    └── vite.config.js                # PWA + Workbox config
```

---

## Deployment

### Backend → Render (free tier)

1. Push `backend/` to a GitHub repo
2. New Web Service on Render → connect repo → root dir: `backend`
3. Build command: `npm install` | Start: `node src/app.js`
4. Set env vars in Render dashboard (copy from `.env.example`)

### Frontend → Cloudflare Pages (free tier)

1. Push `frontend/` to GitHub
2. New Pages project → connect repo → root dir: `frontend`
3. Build: `npm run build` | Output: `dist`
4. Set `VITE_API_BASE_URL` to your Render URL

### Firebase Auth domain

Add your `*.pages.dev` URL to Firebase Console → Auth → Authorized domains.

---

## Adding a Second Scripture (Ramayana)

The schema is already ready:
1. Prepare a JSON file in the same format as `data/gita.json`
2. In `ingest.js`, change `sourceText: 'Bhagavad Gita'` → `'Ramayana'` for the new dataset
3. Run ingestion — all verses share the same `/verses` collection; KNN search works across both
4. No frontend changes needed

---

## License

Verse content: open-access Sanskrit corpus. App code: MIT.
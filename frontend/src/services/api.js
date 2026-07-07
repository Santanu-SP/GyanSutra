/**
 * API service — all fetch calls to the Gyan Sutra Express backend.
 * The base URL is set via VITE_API_BASE_URL in .env.
 * Falls back to localhost:3001 for local development.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

async function request(path, options = {}) {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Chapters ──────────────────────────────────────────────────────────────────
export const getAllChapters = () => request('/chapters');
export const getChapter    = (id) => request(`/chapters/${id}`);
export const getChapterVerses = (id) => request(`/chapters/${id}/verses`);

// ── Verses ────────────────────────────────────────────────────────────────────
export const getVerse = (id) => request(`/verses/${id}`);

// ── Search ────────────────────────────────────────────────────────────────────
export const searchVerses = (q, limit = 10) =>
  request(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);

// ── Ask (RAG) ─────────────────────────────────────────────────────────────────
export const askQuestion = (question) =>
  request('/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });

// ── Recommendations ───────────────────────────────────────────────────────────
export const getRecommendations = (contentId, type = 'verse') =>
  request(`/recommendations/${contentId}?type=${type}`);

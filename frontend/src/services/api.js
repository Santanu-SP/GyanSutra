/**
 * API service - all fetch calls to the Gyan Sutra Express backend.
 * The base URL is set via VITE_API_BASE_URL in .env.
 * Falls back to localhost:3001 for local development.
 */

const defaultBaseUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://gyansutra-backend-0yo7.onrender.com';
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultBaseUrl).replace(/\/$/, '');
const IS_ANDROID_BUILD = import.meta.env.MODE === 'android';
const NATIVE_API_CACHE = 'gyansutra-native-api-v1';
const NATIVE_CACHE_LIMIT = 150;
const localizedVerseRequests = new Map();

async function readNativeCache(url) {
  if (!IS_ANDROID_BUILD || !('caches' in window)) return null;
  const cache = await window.caches.open(NATIVE_API_CACHE);
  return cache.match(url);
}

async function writeNativeCache(url, response) {
  if (!IS_ANDROID_BUILD || !('caches' in window) || !response.ok) return;

  const cache = await window.caches.open(NATIVE_API_CACHE);
  await cache.put(url, response.clone());

  const keys = await cache.keys();
  const overflow = keys.length - NATIVE_CACHE_LIMIT;
  if (overflow > 0) {
    await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
  }
}

async function fetchWithNativeFallback(url, options) {
  const method = (options.method || 'GET').toUpperCase();
  if (!IS_ANDROID_BUILD || method !== 'GET') return fetch(url, options);

  try {
    const response = await fetch(url, options);
    if (response.ok) {
      void writeNativeCache(url, response).catch(() => {});
      return response;
    }

    if (response.status >= 500) {
      const cached = await readNativeCache(url);
      if (cached) return cached;
    }
    return response;
  } catch (error) {
    const cached = await readNativeCache(url);
    if (cached) return cached;
    throw error;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}/api${path}`;
  const method = (options.method || 'GET').toUpperCase();
  const res = await fetchWithNativeFallback(url, {
    headers: method === 'GET'
      ? { ...options.headers }
      : { 'Content-Type': 'application/json', ...options.headers },
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

// ── Sources ───────────────────────────────────────────────────────────────────
export const getSources = () => request('/sources');
export const getSourceVerses = (sourceId) => request(`/verses/source/${sourceId}`);
export const getRamayanaSarga = (kandaNum, sargaNum) => request(`/verses/ramayana/${kandaNum}/${sargaNum}`);

// ── Verses ────────────────────────────────────────────────────────────────────
export const getVerse = (id) => request(`/verses/${id}`);
export const getDailyVerse = () => request('/verses/daily');
export const getLocalizedVerse = (id, language) => {
  const key = `${id}:${language}`;
  if (!localizedVerseRequests.has(key)) {
    const pending = request(`/verses/${encodeURIComponent(id)}/localized?language=${encodeURIComponent(language)}`)
      .then((response) => response.content)
      .catch((error) => {
        localizedVerseRequests.delete(key);
        throw error;
      });
    localizedVerseRequests.set(key, pending);
  }
  return localizedVerseRequests.get(key);
};

// ── Search ────────────────────────────────────────────────────────────────────
export const searchVerses = (q, limit = 10) =>
  request(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);

// ── Ask (RAG) ─────────────────────────────────────────────────────────────────
export const askQuestion = (question, history = [], contextIds = [], language = 'en') =>
  request('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, history, contextIds, language }),
  });

// ── Recommendations ───────────────────────────────────────────────────────────
export const getRecommendations = (contentId, type = 'verse') =>
  request(`/recommendations/${contentId}?type=${type}`);

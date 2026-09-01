'use strict';

/**
 * Small dependency-free TTL/LRU cache for one-process deployments.
 * Entries are disposable: correctness never depends on the cache surviving.
 */
class TTLCache {
  constructor({ maxEntries = 250, ttlMs = 60_000 } = {}) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
    this.ttlMs = Math.max(1, Math.floor(ttlMs));
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Map insertion order is used as the LRU order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1, Math.floor(ttlMs)),
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
    return value;
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

/** Coalesces concurrent work for the same key to prevent cache stampedes. */
class SingleFlight {
  constructor() {
    this.pending = new Map();
  }

  run(key, factory) {
    const existing = this.pending.get(key);
    if (existing) return existing;

    const promise = Promise.resolve()
      .then(factory)
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
}

function withTimeout(promise, timeoutMs, message = 'Operation timed out.') {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(message);
      error.code = 'OPERATION_TIMEOUT';
      reject(error);
    }, timeoutMs);
    timer.unref?.();
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { TTLCache, SingleFlight, withTimeout };

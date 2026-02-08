// Simple server-side in-memory cache with TTL
type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL = 30 * 1000; // 30 seconds

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl?: number): void {
  cache.set(key, { data, timestamp: Date.now() });

  // Auto-cleanup after TTL
  setTimeout(() => {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp >= (ttl || DEFAULT_TTL)) {
      cache.delete(key);
    }
  }, ttl || DEFAULT_TTL);
}

export function invalidateCache(key?: string): void {
  if (key) {
    // Invalidate specific key or all keys matching a prefix
    for (const k of cache.keys()) {
      if (k === key || k.startsWith(key)) {
        cache.delete(k);
      }
    }
  } else {
    cache.clear();
  }
}

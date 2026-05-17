import { LRUCache } from 'lru-cache';

// LRU cache for flight and hotel search results
// max=100 entries, ttl=5 minutes per entry
export const searchCache = new LRUCache<string, object>({
  max: 100,
  ttl: 300_000, // 5 minutes in milliseconds
});

/**
 * Build a deterministic cache key from search type and params.
 * Keys are sorted so {a:1, b:2} and {b:2, a:1} produce the same string.
 */
export function getCacheKey(type: 'flight' | 'hotel', params: object): string {
  const sorted = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${type}:${JSON.stringify(sorted)}`;
}

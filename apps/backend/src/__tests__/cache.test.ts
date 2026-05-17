/**
 * LRU search cache — unit tests
 *
 * Tests:
 *   - getCacheKey is deterministic regardless of key insertion order
 *   - searchCache evicts entries when max capacity is exceeded (LRU behaviour)
 *   - ttl-based expiry: entries expire after the configured TTL
 */

import { LRUCache } from 'lru-cache';
import { getCacheKey, searchCache } from '../lib/searchCache';

describe('getCacheKey', () => {
  it('produces the same key for identical params in different key orders', () => {
    const key1 = getCacheKey('flight', { origin: 'SVO', destination: 'IST', departure_date: '2026-06-01' });
    const key2 = getCacheKey('flight', { departure_date: '2026-06-01', destination: 'IST', origin: 'SVO' });
    expect(key1).toBe(key2);
  });

  it('prefixes the key with the type', () => {
    const flightKey = getCacheKey('flight', { city: 'Moscow' });
    const hotelKey = getCacheKey('hotel', { city: 'Moscow' });
    expect(flightKey).toMatch(/^flight:/);
    expect(hotelKey).toMatch(/^hotel:/);
    expect(flightKey).not.toBe(hotelKey);
  });

  it('produces different keys for different params', () => {
    const key1 = getCacheKey('flight', { origin: 'SVO', destination: 'LED' });
    const key2 = getCacheKey('flight', { origin: 'SVO', destination: 'IST' });
    expect(key1).not.toBe(key2);
  });

  it('ignores undefined and null values (they should not affect key)', () => {
    const key1 = getCacheKey('hotel', { city: 'Istanbul', stars: undefined });
    const key2 = getCacheKey('hotel', { city: 'Istanbul' });
    expect(key1).toBe(key2);
  });
});

describe('searchCache LRU behaviour', () => {
  afterEach(() => {
    searchCache.clear();
  });

  it('stores and retrieves values', () => {
    const key = getCacheKey('flight', { origin: 'SVO', destination: 'DXB' });
    const value = { offers: [], count: 0 };
    searchCache.set(key, value);
    expect(searchCache.get(key)).toEqual(value);
  });

  it('evicts the oldest entries when max capacity (100) is exceeded', () => {
    // Fill cache to capacity + 1
    const firstKey = getCacheKey('hotel', { city: 'first_entry' });
    searchCache.set(firstKey, { offers: [] });

    for (let i = 0; i < 100; i++) {
      searchCache.set(getCacheKey('hotel', { city: `city_${i}` }), { offers: [] });
    }

    // The first entry should now have been evicted
    expect(searchCache.get(firstKey)).toBeUndefined();
    // Total size should not exceed max
    expect(searchCache.size).toBeLessThanOrEqual(100);
  });

  it('returns undefined for missing keys', () => {
    expect(searchCache.get('non_existent_key')).toBeUndefined();
  });

  it('respects ttl: a custom cache with short ttl expires entries', () => {
    // Use a dedicated cache with 1ms ttl to test expiry without waiting 5 min
    const shortLived = new LRUCache<string, string>({ max: 10, ttl: 1 });
    shortLived.set('k', 'v');

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortLived.get('k')).toBeUndefined();
        resolve();
      }, 10);
    });
  });
});

/**
 * Lightweight, zero-dependency in-memory TTL cache.
 * Designed to prevent redundant remote database roundtrips to Neon Postgres
 * during peak traffic, while keeping builds 100% resilient and dynamic.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

// Global cache store persists across warm serverless function invocations
const cacheStore = new Map<string, CacheEntry<any>>();

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cacheStore.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const data = await fetcher();
  cacheStore.set(key, {
    data,
    expiresAt: now + ttlSeconds * 1000,
  });

  return data;
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key);
    }
  }
}

"use client";

/**
 * Client-side session request deduplicator and short-lived cache.
 * Prevents 5+ simultaneous identical HTTP requests to /api/auth/session
 * from firing on every single page load.
 */

type SessionResponse = {
  account?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  } | null;
};

let inFlightPromise: Promise<SessionResponse> | null = null;
let cachedSession: SessionResponse | null = null;
let cacheTimestamp = 0;
const SESSION_CACHE_TTL_MS = 60_000; // 60 seconds

export async function getClientSession(forceFresh = false): Promise<SessionResponse> {
  const now = Date.now();

  // Return cached result if valid and not forcing fresh
  if (!forceFresh && cachedSession !== null && now - cacheTimestamp < SESSION_CACHE_TTL_MS) {
    return cachedSession;
  }

  // Deduplicate in-flight requests: all components share the same single fetch
  if (!inFlightPromise || forceFresh) {
    inFlightPromise = fetch("/api/auth/session", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return { account: null };
        const data = (await res.json()) as SessionResponse;
        cachedSession = data;
        cacheTimestamp = Date.now();
        return data;
      })
      .catch(() => ({ account: null }))
      .finally(() => {
        inFlightPromise = null;
      });
  }

  return inFlightPromise;
}

export function invalidateClientSession(): void {
  cachedSession = null;
  cacheTimestamp = 0;
  inFlightPromise = null;
}

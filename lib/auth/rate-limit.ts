import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter for sensitive endpoints
 * (login, password reset). Deliberately not Redis-backed: this app runs as
 * a single Node process under cPanel/Passenger, so an in-memory map is
 * sufficient and avoids introducing infrastructure the spec explicitly
 * wants minimized. Known limitation: counters reset on process restart and
 * are not shared across multiple app instances — acceptable at this scale
 * (documented in docs/security.md).
 */

type Bucket = { count: number; windowStartMs: number };

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this map doesn't grow unbounded across
// a long-running process.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let lastSweep = Date.now();

function sweepIfDue(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartMs > SWEEP_INTERVAL_MS) buckets.delete(key);
  }
}

export function isRateLimited(
  key: string,
  { maxAttempts, windowMs }: { maxAttempts: number; windowMs: number },
): boolean {
  const now = Date.now();
  sweepIfDue(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartMs > windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxAttempts;
}

export const LOGIN_RATE_LIMIT = { maxAttempts: 10, windowMs: 15 * 60 * 1000 };

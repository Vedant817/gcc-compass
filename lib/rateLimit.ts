/**
 * Shared per-client rate limiting for the LLM routes.
 *
 * Two rules make the limiter worth having on Vercel:
 *
 * 1. The bucket key has to be an address the platform vouches for. The leftmost
 *    `x-forwarded-for` entry is whatever the client sent, so keying on it lets one
 *    visitor mint unlimited buckets and bypass every per-IP cap. `x-real-ip` is set
 *    (and overwritten) by the platform, so it is trusted first; without it, the
 *    rightmost `x-forwarded-for` entry is the one the platform appended.
 * 2. The bucket map is bounded. When it fills up, expired buckets go first, then
 *    the oldest tracked one. Never wiping the whole map means a flood of spoofed
 *    keys cannot reset other clients' active counters.
 */

/** Narrow header shape so tests can pass plain objects with a `Headers`-like getter. */
export interface HeaderReader {
  headers: {
    get(name: string): string | null;
  };
}

/**
 * The platform-vouched client IP for a request.
 *
 * `x-real-ip` first, then the rightmost `x-forwarded-for` entry, then "local"
 * (same fallback the routes used before this helper existed) for direct calls
 * on a box with no proxy in front.
 */
export function clientIp(req: HeaderReader): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const platformAdded = entries[entries.length - 1];
    if (platformAdded) return platformAdded;
  }
  return "local";
}

/** State one bucket carries inside a limiter's window. */
interface Bucket {
  count: number;
  reset: number;
}

export interface RateLimiterOptions {
  /** Requests each client gets per 60-second window. */
  limitPerMinute: number;
  /**
   * Bucket keys a limiter tracks before it evicts. Past this many spoofed or
   * long-tail keys, eviction keeps the map bounded instead of letting it grow
   * without limit on a warm serverless instance.
   */
  maxTrackedIps?: number;
}

/**
 * Build one limiter with its own bucket map. Each route module creates its own,
 * so a route's budget stays independent of the others'; per-key counting works
 * the same as before this shared module.
 */
export function makeRateLimiter(options: RateLimiterOptions): (ip: string) => boolean {
  const maxTrackedIps = options.maxTrackedIps ?? 500;
  const hits = new Map<string, Bucket>();

  return function rateLimited(ip: string): boolean {
    const now = Date.now();
    const bucket = hits.get(ip);
    if (!bucket || now > bucket.reset) {
      if (hits.size >= maxTrackedIps) {
        // expired windows first: they are dead weight, not budgets
        for (const [key, rec] of hits) {
          if (now > rec.reset) hits.delete(key);
        }
        // still full: drop the oldest tracked keys one at a time, never the map
        while (hits.size >= maxTrackedIps) {
          const oldest = hits.keys().next().value;
          if (oldest === undefined) break;
          hits.delete(oldest);
        }
      }
      hits.set(ip, { count: 1, reset: now + 60_000 });
      return false;
    }
    bucket.count += 1;
    return bucket.count > options.limitPerMinute;
  };
}

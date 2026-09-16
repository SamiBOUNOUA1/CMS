/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * NOTE: state lives in the process, so on a multi-instance / serverless
 * deployment each instance keeps its own counters. For robust protection
 * across instances, back this with a shared store (Redis / Mongo TTL doc).
 */
interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Records a hit for `key` and reports whether it is within `limit` over
 * `windowMs`. Returns `allowed: false` once the limit is exceeded.
 */
export function rateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

/** Clears the counter for a key (e.g. after a successful login). */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}

/** Best-effort client IP extraction from forwarded headers. */
export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

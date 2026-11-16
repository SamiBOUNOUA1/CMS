/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * NOTE: state lives in the process, so on a multi-instance / serverless
 * deployment each instance keeps its own counters. For robust protection
 * across instances, back this with a shared store (Redis / Mongo TTL doc).
 */
import { createHash } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { RateLimitHit } from '@/lib/models';

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

/**
 * Same counting as `rateLimit`, but stored in MongoDB so every server instance
 * shares it and it survives restarts. Use it for login, 2FA and password
 * checks. Falls back to the in-memory counter if the database can't be reached.
 */
export async function rateLimitShared(key: string, limit = 5, windowMs = 15 * 60 * 1000): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;
  try {
    await connectDB();
    const doc = await RateLimitHit.findOneAndUpdate(
      { key: storeKey(key, now, windowMs) },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt) } },
      { upsert: true, new: true },
    ).lean();
    const count = (doc as { count?: number } | null)?.count ?? 1;
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((resetAt - now) / 1000) };
    }
    return { allowed: true, remaining: limit - count, retryAfterSeconds: 0 };
  } catch {
    return rateLimit(key, limit, windowMs);
  }
}

/** Clears a shared counter (e.g. after a successful login). */
export async function rateLimitSharedReset(key: string, windowMs = 15 * 60 * 1000): Promise<void> {
  rateLimitReset(key);
  try {
    await connectDB();
    await RateLimitHit.deleteOne({ key: storeKey(key, Date.now(), windowMs) });
  } catch {
    /* the counter expires on its own */
  }
}

// One row per key and time window. Hashed, so no email or IP address is stored.
function storeKey(key: string, now: number, windowMs: number): string {
  return createHash('sha256').update(`${key}|${Math.floor(now / windowMs)}`).digest('hex');
}

/**
 * Client IP for rate limiting, read from X-Forwarded-For.
 *
 * Proxies append to that header, so only its last entries are trustworthy; the
 * first ones are whatever the client sent. TRUSTED_PROXY_HOPS says how many
 * entries our own infrastructure adds (default 1: the last entry). If it is set
 * too low, the address is a load balancer's and the limit is shared by all
 * clients; it is never an address the client can choose.
 */
export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  const parts = (request.headers.get('x-forwarded-for') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length) return parts[Math.max(0, parts.length - hops)];
  return request.headers.get('x-real-ip') || 'unknown';
}

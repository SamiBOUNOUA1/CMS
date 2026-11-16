// @ts-nocheck
/**
 * Session revocation. Every session token carries the account's
 * `sessionVersion` at the time it was issued (claim `sv`). Bumping the number on
 * the account ends all of its open sessions: used when a user is deactivated,
 * changes role or password, has 2FA reset, or logs out.
 *
 * The account is read at most once per CACHE_MS per server instance, so a
 * revocation reaches other instances within that delay.
 */
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { User, PlatformAdmin } from '@/lib/models';
import { runWithTenant } from '@/lib/tenantContext';

const CACHE_MS = 30_000;

type State = { active: boolean; version: number } | null;

// Shared via globalThis for the same reason as the license cache (lib/license.ts).
const g = globalThis as unknown as { __sessionStateCache?: Map<string, { at: number; value: State }> };
const cache = (g.__sessionStateCache ??= new Map());

async function loadState(key: string, load: () => Promise<{ isActive?: boolean; sessionVersion?: number } | null>): Promise<State> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  await connectDB();
  const doc = await load();
  const value = doc ? { active: doc.isActive !== false, version: doc.sessionVersion ?? 0 } : null;
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** True when the tenant user still exists, is active, and the token's version is the current one. */
export async function isUserSessionCurrent(tenantId: string, userId: string, tokenVersion: number): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(tenantId)) return false;
  const state = await loadState(`u:${userId}`, () =>
    // Scoped to the token's tenant, so a token can never match another tenant's user.
    runWithTenant(tenantId, () => User.findById(userId).select('isActive sessionVersion').lean()),
  );
  return !!state && state.active && state.version === tokenVersion;
}

/** Same check for a platform operator session. */
export async function isPlatformSessionCurrent(adminId: string, tokenVersion: number): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(adminId)) return false;
  const state = await loadState(`p:${adminId}`, () =>
    PlatformAdmin.findById(adminId).select('isActive sessionVersion').lean(),
  );
  return !!state && state.active && state.version === tokenVersion;
}

/** Drops cached state after an account changed (call right after bumping sessionVersion). */
export function forgetSessionState(id?: string) {
  if (!id) { cache.clear(); return; }
  cache.delete(`u:${id}`);
  cache.delete(`p:${id}`);
}

/** The update that ends an account's open sessions. Merge it into the account update. */
export const REVOKE_SESSIONS = { $inc: { sessionVersion: 1 } };

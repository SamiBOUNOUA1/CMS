import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request tenant context. Every tenant-owned Mongoose model (see
 * tenantPlugin.ts) reads this to scope its queries, so route handlers must run
 * inside `runWithTenant` (done for them by `withTenant` in requireAuth.ts).
 *
 * `system` is the explicit escape hatch for cross-tenant work (login lookup,
 * platform console metrics, tenant provisioning) — queries then run unscoped.
 */
type TenantStore = { tenantId: string } | { system: true };

// One instance per process, shared via globalThis: in `next dev` each route can
// get its own copy of this module, while Mongoose models (and the plugin hooks
// reading this storage) are cached once per process. Separate instances would
// make the context set by one route invisible to the plugin.
const g = globalThis as unknown as { __tenantStorage?: AsyncLocalStorage<TenantStore> };
const storage = (g.__tenantStorage ??= new AsyncLocalStorage<TenantStore>());

// Both runners await `fn()` *inside* the context: Mongoose queries are lazy
// thenables, so returning one unawaited would execute it outside the context.
export function runWithTenant<T>(tenantId: string, fn: () => T | PromiseLike<T>): Promise<T> {
  if (!tenantId) throw new Error('runWithTenant: tenantId is required');
  return storage.run({ tenantId: String(tenantId) }, async () => await fn());
}

export function runAsSystem<T>(fn: () => T | PromiseLike<T>): Promise<T> {
  return storage.run({ system: true }, async () => await fn());
}

export function getTenantStore(): TenantStore | undefined {
  return storage.getStore();
}

/** Current tenant id, or null when running as system / outside any context. */
export function getTenantId(): string | null {
  const s = storage.getStore();
  return s && 'tenantId' in s ? s.tenantId : null;
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE, PLATFORM_COOKIE } from '@/lib/auth';
import { getTenantLicense } from '@/lib/license';
import { runWithTenant } from '@/lib/tenantContext';

export interface AuthContext {
  userId: string;
  role: string;
  tenantId: string;
  permissions: Record<string, boolean>;
}

/** Verifies the `cq_token` cookie and returns its claims, without the license check. */
async function readSession(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  // Tenant tokens must carry a tenantId; platform tokens never do.
  if (!payload || !payload.tenantId || payload.platform) return null;
  return {
    userId: String(payload.id),
    role: String(payload.role),
    tenantId: String(payload.tenantId),
    permissions: (payload.permissions ?? {}) as Record<string, boolean>,
  };
}

/**
 * Returns the trusted auth context by verifying the `cq_token` cookie, or `null`
 * when there is no valid session or the tenant's license is inactive. This
 * re-verifies the JWT inside the route handler, so it never trusts the
 * (spoofable) `x-user-*` request headers.
 */
export async function getAuth(request: NextRequest): Promise<AuthContext | null> {
  const auth = await readSession(request);
  if (!auth) return null;
  const license = await getTenantLicense(auth.tenantId);
  return license.active ? auth : null;
}

type Guarded =
  | { auth: AuthContext; error?: undefined }
  | { auth?: undefined; error: NextResponse };

/**
 * Guard helper for route handlers. Returns `{ auth }` when the caller is
 * authenticated and (when `perm` is given) holds the permission, otherwise
 * returns `{ error }` with the response to return early.
 *
 * Usage:
 *   const { auth, error } = await requirePermission(request, 'manage_inventory');
 *   if (error) return error;
 *   // ...use auth.userId / auth.permissions
 */
export async function requirePermission(request: NextRequest, perm?: string): Promise<Guarded> {
  const auth = await getAuth(request);
  if (!auth) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (perm && !auth.permissions[perm]) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { auth };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (request: NextRequest, ctx: any) => Promise<Response> | Response;

/**
 * Wraps a route handler so it only runs for an authenticated user of an
 * active tenant, inside that tenant's context (which scopes every Mongoose
 * query — see tenantPlugin.ts). Permission checks stay in the handler.
 *
 *   async function GET_(request) { ... }
 *   export const GET = withTenant(GET_);
 */
export function withTenant(handler: RouteHandler): RouteHandler {
  return async (request, ctx) => {
    const auth = await readSession(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const license = await getTenantLicense(auth.tenantId);
    if (!license.active) {
      return NextResponse.json({ error: 'license_inactive', reason: license.reason }, { status: 403 });
    }
    return runWithTenant(auth.tenantId, () => handler(request, ctx));
  };
}

// ── Platform (SaaS operator) auth ─────────────────────────────────────────────

export interface PlatformAuth {
  adminId: string;
  name: string;
}

export async function getPlatformAuth(request: NextRequest): Promise<PlatformAuth | null> {
  const token = request.cookies.get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.platform !== true) return null;
  return { adminId: String(payload.id), name: String(payload.name ?? '') };
}

/** Like withTenant, for /api/platform/** routes. Handlers receive the platform admin as 3rd arg. */
export function withPlatformAdmin(
  handler: (request: NextRequest, ctx: any, admin: PlatformAuth) => Promise<Response> | Response, // eslint-disable-line @typescript-eslint/no-explicit-any
): RouteHandler {
  return async (request, ctx) => {
    const admin = await getPlatformAuth(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(request, ctx, admin);
  };
}

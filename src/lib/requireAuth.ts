import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE } from '@/lib/auth';

export interface AuthContext {
  userId: string;
  role: string;
  permissions: Record<string, boolean>;
}

/**
 * Returns the trusted auth context by verifying the `cq_token` cookie, or `null`
 * when there is no valid session. This re-verifies the JWT inside the route
 * handler, so it never trusts the (spoofable) `x-user-*` request headers.
 */
export async function getAuth(request: NextRequest): Promise<AuthContext | null> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return {
    userId: String(payload.id),
    role: String(payload.role),
    permissions: (payload.permissions ?? {}) as Record<string, boolean>,
  };
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

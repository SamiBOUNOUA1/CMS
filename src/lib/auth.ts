import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE = 'cq_token';
const PLATFORM_COOKIE = 'cq_platform_token'; // SaaS operator console session (separate from tenant users)
const TTL = 60 * 60 * 8; // 8 hours

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Short-lived token issued after a correct password when the account has 2FA.
// It lives in its own cookie and is only accepted by the MFA verify routes.
const MFA_PENDING_COOKIE = 'cq_mfa_pending';
const PLATFORM_MFA_PENDING_COOKIE = 'cq_platform_mfa_pending';
export const MFA_PENDING_TTL = 60 * 5; // 5 minutes

export async function signPendingToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...payload, mfaPending: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MFA_PENDING_TTL}s`)
    .sign(secret);
}

export async function verifyPendingToken(token: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload && payload.mfaPending === true ? payload : null;
}

export function cookieOptions(maxAge = TTL): Record<string, unknown> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export { COOKIE, PLATFORM_COOKIE, MFA_PENDING_COOKIE, PLATFORM_MFA_PENDING_COOKIE };

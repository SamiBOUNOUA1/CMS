// @ts-nocheck
import { NextResponse } from 'next/server';
import { RolePermissions, Tenant } from '@/lib/models';
import { signToken, cookieOptions, COOKIE, PLATFORM_COOKIE } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';
import { runWithTenant } from '@/lib/tenantContext';
import { getTenantLicense, getEnabledModules } from '@/lib/license';

/**
 * Builds the session token for a user. Returns an object with only
 * `licenseReason` when the tenant's license is inactive.
 */
export async function buildTenantSession(user) {
  const tenantId = String(user.tenantId);
  const license = await getTenantLicense(tenantId);
  if (!license.active) return { licenseReason: license.reason };

  const roleDoc = await runWithTenant(tenantId, () => RolePermissions.findOne({ role: user.role }).lean());
  const permissions = buildPermissions(user.role, roleDoc?.permissions);

  const token = await signToken({
    id: user._id.toString(), role: user.role, name: user.name, permissions,
    tenantId,
    // Session version at issue time; a later bump on the user ends this session.
    sv: user.sessionVersion ?? 0,
    // Lets the edge middleware block expired licenses without a DB call.
    licenseExpiresAt: license.expiresAt ? license.expiresAt.getTime() : null,
    // Fallback for the middleware's page guard if it can't fetch live module state.
    modules: await getEnabledModules(tenantId),
  });
  return { token, permissions };
}

/**
 * Issues the full tenant session (cq_token) for an authenticated user.
 * Returns a 403 response instead when the tenant's license is inactive.
 */
export async function issueTenantSession(user): Promise<NextResponse> {
  const session = await buildTenantSession(user);
  if (!session.token)
    return NextResponse.json({ error: 'license_inactive', reason: session.licenseReason }, { status: 403 });
  const { token, permissions } = session;

  await Tenant.updateOne({ _id: String(user.tenantId) }, { lastActivityAt: new Date() });

  const res = NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions } });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}

/** Token for the platform operator session. */
export function buildPlatformToken(admin): Promise<string> {
  return signToken({ id: admin._id.toString(), name: admin.name, platform: true, sv: admin.sessionVersion ?? 0 });
}

/** Issues the platform operator session (cq_platform_token). */
export async function issuePlatformSession(admin): Promise<NextResponse> {
  const token = await buildPlatformToken(admin);
  const res = NextResponse.json({ ok: true, admin: { name: admin.name, email: admin.email } });
  res.cookies.set(PLATFORM_COOKIE, token, cookieOptions());
  return res;
}

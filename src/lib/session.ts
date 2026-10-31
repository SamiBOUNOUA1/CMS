// @ts-nocheck
import { NextResponse } from 'next/server';
import { RolePermissions, Tenant } from '@/lib/models';
import { signToken, cookieOptions, COOKIE, PLATFORM_COOKIE } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';
import { runWithTenant } from '@/lib/tenantContext';
import { getTenantLicense, getEnabledModules } from '@/lib/license';

/**
 * Issues the full tenant session (cq_token) for an authenticated user.
 * Returns a 403 response instead when the tenant's license is inactive.
 */
export async function issueTenantSession(user): Promise<NextResponse> {
  const tenantId = String(user.tenantId);
  const license = await getTenantLicense(tenantId);
  if (!license.active)
    return NextResponse.json({ error: 'license_inactive', reason: license.reason }, { status: 403 });

  const roleDoc = await runWithTenant(tenantId, () => RolePermissions.findOne({ role: user.role }).lean());
  const permissions = buildPermissions(user.role, roleDoc?.permissions);

  await Tenant.updateOne({ _id: tenantId }, { lastActivityAt: new Date() });

  const token = await signToken({
    id: user._id.toString(), role: user.role, name: user.name, permissions,
    tenantId,
    // Lets the edge middleware block expired licenses without a DB call.
    licenseExpiresAt: license.expiresAt ? license.expiresAt.getTime() : null,
    // Fallback for the middleware's page guard if it can't fetch live module state.
    modules: await getEnabledModules(tenantId),
  });

  const res = NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions } });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}

/** Issues the platform operator session (cq_platform_token). */
export async function issuePlatformSession(admin): Promise<NextResponse> {
  const token = await signToken({ id: admin._id.toString(), name: admin.name, platform: true });
  const res = NextResponse.json({ ok: true, admin: { name: admin.name, email: admin.email } });
  res.cookies.set(PLATFORM_COOKIE, token, cookieOptions());
  return res;
}

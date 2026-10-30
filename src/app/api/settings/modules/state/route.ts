// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ModuleConfig } from '@/lib/models';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getAuth } from '@/lib/requireAuth';
import { getTenantLicense } from '@/lib/license';
import { runWithTenant } from '@/lib/tenantContext';

// Effective enabled modules for the caller's tenant: the tenant's own toggles
// intersected with what its plan allows. Called by middleware (with the
// user's cookie forwarded) and by the client UI.
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ enabledModuleIds: MODULE_REGISTRY.filter(m => m.builtIn).map(m => m.id) });
  }
  const license = await getTenantLicense(auth.tenantId);
  const allowed = new Set(license.allowedModules);
  try {
    await connectDB();
    const stored = await runWithTenant(auth.tenantId, () => ModuleConfig.find({}).lean());
    const storedMap = Object.fromEntries(stored.map(r => [r.moduleId, r.isEnabled]));

    const enabledModuleIds = MODULE_REGISTRY
      .filter(m => m.builtIn || (allowed.has(m.id) && storedMap[m.id] !== false))
      .map(m => m.id);

    return NextResponse.json({ enabledModuleIds });
  } catch {
    // Fail open on the tenant's toggles, but never beyond what the plan allows.
    return NextResponse.json({
      enabledModuleIds: MODULE_REGISTRY.filter(m => m.builtIn || allowed.has(m.id)).map(m => m.id),
    });
  }
}

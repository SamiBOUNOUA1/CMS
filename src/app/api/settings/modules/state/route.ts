// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getAuth } from '@/lib/requireAuth';
import { getEnabledModules } from '@/lib/license';

// Effective enabled modules for the caller's tenant: the tenant's own toggles
// intersected with what its plan allows. Called by middleware (with the
// user's cookie forwarded) and by the client UI.
export async function GET(request: NextRequest) {
  const builtIn = MODULE_REGISTRY.filter(m => m.builtIn).map(m => m.id);
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ enabledModuleIds: builtIn });
  try {
    return NextResponse.json({ enabledModuleIds: await getEnabledModules(auth.tenantId) });
  } catch {
    // Fail closed: only built-in modules if the DB can't be read.
    return NextResponse.json({ enabledModuleIds: builtIn });
  }
}

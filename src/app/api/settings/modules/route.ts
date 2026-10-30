// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ModuleConfig } from '@/lib/models';
import { MODULE_REGISTRY } from '@/lib/modules';
import { getTenantId } from '@/lib/tenantContext';
import { getTenantLicense } from '@/lib/license';
import { requirePermission } from '@/lib/requireAuth';

async function GET_() {
  try {
    await connectDB();
    const allowed = new Set((await getTenantLicense(getTenantId())).allowedModules);
    const stored = await ModuleConfig.find({});
    const storedMap = Object.fromEntries(stored.map(r => [r.moduleId, r.isEnabled]));

    // allowedByPlan = false → the tenant's license doesn't include it (shown locked in the UI).
    const modules = MODULE_REGISTRY.map(m => {
      const allowedByPlan = m.builtIn || allowed.has(m.id);
      return { ...m, allowedByPlan, isEnabled: m.builtIn ? true : (allowedByPlan && storedMap[m.id] !== false) };
    });

    return NextResponse.json({ modules });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

async function PATCH_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;

    const body = await request.json();
    const updates = Array.isArray(body) ? body : [body];

    await connectDB();
    const allowed = new Set((await getTenantLicense(getTenantId())).allowedModules);

    const results = [];
    for (const { moduleId, isEnabled } of updates) {
      const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
      if (!mod) continue;
      if (mod.builtIn && !isEnabled) {
        return NextResponse.json(
          { error: `Module "${moduleId}" is built-in and cannot be disabled.` },
          { status: 400 }
        );
      }
      if (!mod.builtIn && isEnabled && !allowed.has(moduleId)) {
        return NextResponse.json(
          { error: `Module "${moduleId}" is not included in your plan.`, code: 'module_not_in_plan' },
          { status: 403 }
        );
      }
      const doc = await ModuleConfig.findOneAndUpdate(
        { moduleId },
        { isEnabled },
        { upsert: true, new: true }
      );
      results.push(doc);
    }

    return NextResponse.json({ updated: results.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);

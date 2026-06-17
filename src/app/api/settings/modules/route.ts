// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ModuleConfig } from '@/lib/models';
import { MODULE_REGISTRY } from '@/lib/modules';
import { requirePermission } from '@/lib/requireAuth';

export async function GET() {
  try {
    await connectDB();
    const stored = await ModuleConfig.find({});
    const storedMap = Object.fromEntries(stored.map(r => [r.moduleId, r.isEnabled]));

    const modules = MODULE_REGISTRY.map(m => ({
      ...m,
      isEnabled: m.builtIn ? true : (storedMap[m.id] !== false),
    }));

    return NextResponse.json({ modules });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;

    const body = await request.json();
    const updates = Array.isArray(body) ? body : [body];

    await connectDB();

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

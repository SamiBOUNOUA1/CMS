// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ModuleConfig } from '@/lib/models';
import { MODULE_REGISTRY } from '@/lib/modules';

export async function GET() {
  try {
    await connectDB();
    const stored = await ModuleConfig.find({});
    const storedMap = Object.fromEntries(stored.map(r => [r.moduleId, r.isEnabled]));

    const enabledModuleIds = MODULE_REGISTRY
      .filter(m => m.builtIn || (storedMap[m.id] !== false))
      .map(m => m.id);

    return NextResponse.json({ enabledModuleIds });
  } catch {
    // Fail open — return all modules enabled if DB unreachable
    return NextResponse.json({ enabledModuleIds: MODULE_REGISTRY.map(m => m.id) });
  }
}

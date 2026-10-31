// @ts-nocheck
import { withPlatformAdmin } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';
import { mfaStatus, startSetup, confirmSetup, disableMfa, regenerateRecoveryCodes } from '@/lib/mfaService';

// Two-factor status of the signed-in platform operator.
export const GET = withPlatformAdmin(async (_request: NextRequest, _ctx, admin) => {
  try {
    await connectDB();
    const status = await mfaStatus(PlatformAdmin, admin.adminId);
    if (!status) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(status);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});

// Self-service 2FA actions: setup | enable | disable | regenerate.
export const POST = withPlatformAdmin(async (request: NextRequest, _ctx, admin) => {
  try {
    await connectDB();
    const body = await request.json();
    const id = admin.adminId;

    let result;
    switch (body.action) {
      case 'setup':      result = await startSetup(PlatformAdmin, id); break;
      case 'enable':     result = await confirmSetup(PlatformAdmin, id, body.code); break;
      case 'disable':    result = await disableMfa(PlatformAdmin, id, body); break;
      case 'regenerate': result = await regenerateRecoveryCodes(PlatformAdmin, id, body.code); break;
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    const { label, ...rest } = result; // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json(rest);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});

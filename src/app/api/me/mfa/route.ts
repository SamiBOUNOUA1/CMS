// @ts-nocheck
import { withTenant, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { mfaStatus, startSetup, confirmSetup, disableMfa, regenerateRecoveryCodes } from '@/lib/mfaService';

// Two-factor status of the authenticated user.
async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const status = await mfaStatus(User, auth.userId);
    if (!status) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(status);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// Self-service 2FA actions: setup | enable | disable | regenerate.
async function POST_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const body = await request.json();
    const id = auth.userId;

    let result;
    switch (body.action) {
      case 'setup':
        result = await startSetup(User, id);
        break;
      case 'enable':
        result = await confirmSetup(User, id, body.code);
        if (!result.error) {
          await logActivity({ action: 'mfa_enabled', entityType: 'user', entityId: id, entityLabel: result.label, performedBy: id });
        }
        break;
      case 'disable':
        result = await disableMfa(User, id, body);
        if (!result.error && result.label) {
          await logActivity({ action: 'mfa_disabled', entityType: 'user', entityId: id, entityLabel: result.label, performedBy: id });
        }
        break;
      case 'regenerate':
        result = await regenerateRecoveryCodes(User, id, body.code);
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    const { label, ...rest } = result; // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json(rest);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);

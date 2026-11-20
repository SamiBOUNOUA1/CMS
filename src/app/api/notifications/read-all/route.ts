// @ts-nocheck
// POST /api/notifications/read-all — marks all of the user's notifications read.
import { withTenant, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models';
import { serverError } from '@/lib/logger';

async function POST_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const r = await Notification.updateMany({ recipient: auth.userId, readAt: null }, { $set: { readAt: new Date() } });
    return NextResponse.json({ updated: r.modifiedCount ?? 0 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const POST = withTenant(POST_);

// @ts-nocheck
// PATCH /api/notifications/[id] { read: boolean } — only the recipient's own.
import { withTenant, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models';
import { serverError } from '@/lib/logger';

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const read = body.read !== false;
    const n = await Notification.findOneAndUpdate(
      { _id: params.id, recipient: auth.userId },
      { $set: { readAt: read ? new Date() : null } },
      { new: true },
    ).select('-dedupeKey').lean();
    if (!n) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ notification: n });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const PATCH = withTenant(PATCH_);

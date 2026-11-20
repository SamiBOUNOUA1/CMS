// @ts-nocheck
// Cheap unread count polled by the header bell.
import { withTenant, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models';
import { serverError } from '@/lib/logger';

async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const unreadCount = await Notification.countDocuments({ recipient: auth.userId, readAt: null });
    return NextResponse.json({ unreadCount });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);

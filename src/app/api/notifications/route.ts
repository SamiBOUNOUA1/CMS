// @ts-nocheck
// The signed-in user's notifications, newest first.
// GET /api/notifications?page=1&limit=20&unread=1
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

    const sp = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '20', 10) || 20));
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
    const mine = { recipient: auth.userId };
    const filter = sp.get('unread') === '1' ? { ...mine, readAt: null } : mine;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actor', 'name')
        .select('-dedupeKey')
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...mine, readAt: null }),
    ]);
    return NextResponse.json({ notifications, total, page, limit, unreadCount });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);

// @ts-nocheck
// Public (no cookie): the secret iCal subscription feed polled by Google /
// Apple / Outlook Calendar. The token in the URL is the credential; every
// request re-checks the account, license and permissions (lib/calendarFeed.ts).
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CalendarFeed } from '@/lib/models';
import { hashFeedToken, renderFeed, resolveFeed } from '@/lib/calendarFeed';
import { rateLimitShared } from '@/lib/rateLimit';
import { runWithTenant } from '@/lib/tenantContext';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const HOUR = 3600 * 1000;
const notFound = () => new NextResponse('Not found', { status: 404 });

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = String(params.token || '').replace(/\.ics$/i, '');
    // Calendar clients poll a few times an hour at most; this only stops abuse.
    const rl = await rateLimitShared(`icalfeed:${hashFeedToken(token)}`, 60, HOUR);
    if (!rl.allowed) {
      return new NextResponse('Too many requests', { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } });
    }

    await connectDB();
    const resolved = await resolveFeed(token);
    if (!resolved) return notFound();

    const body = await runWithTenant(resolved.tenantId, () => renderFeed(request, resolved));

    const last = resolved.feed.lastAccessedAt ? new Date(resolved.feed.lastAccessedAt).getTime() : 0;
    if (Date.now() - last > HOUR) {
      await CalendarFeed.updateOne({ _id: resolved.feed._id }, { $set: { lastAccessedAt: new Date() } });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="events.ics"',
        'Cache-Control': 'private, max-age=900',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (err) {
    await logError(err, { route: '/api/calendar/feed', method: 'GET', tenantId: null, status: 500 });
    return new NextResponse('Server error', { status: 500 });
  }
}

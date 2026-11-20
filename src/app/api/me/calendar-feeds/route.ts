// @ts-nocheck
// Self-service management of the current user's calendar subscription links.
import { withTenant, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CalendarFeed } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { FEED_SCOPES, feedUrl, issueFeed, scopeAllowed } from '@/lib/calendarFeed';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// GET — which feeds exist (never the tokens) and which scopes this user may create.
async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return unauthorized();
    await connectDB();
    const feeds = await CalendarFeed.find({ tenantId: auth.tenantId, user: auth.userId })
      .select('scope createdAt updatedAt lastAccessedAt').lean();
    return NextResponse.json({
      feeds: feeds.map(f => ({ scope: f.scope, createdAt: f.updatedAt || f.createdAt, lastAccessedAt: f.lastAccessedAt })),
      allowedScopes: FEED_SCOPES.filter(s => scopeAllowed(s, auth.permissions)),
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST { scope } — create or regenerate; returns the URL once.
async function POST_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return unauthorized();
    const { scope } = await request.json().catch(() => ({}));
    if (!FEED_SCOPES.includes(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    if (!scopeAllowed(scope, auth.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();
    const token = await issueFeed(auth.tenantId, auth.userId, scope);
    return NextResponse.json({ scope, url: feedUrl(request, token) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// DELETE ?scope= — revoke.
async function DELETE_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return unauthorized();
    const scope = request.nextUrl.searchParams.get('scope');
    if (!FEED_SCOPES.includes(scope)) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    await connectDB();
    await CalendarFeed.deleteOne({ tenantId: auth.tenantId, user: auth.userId, scope });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
export const DELETE = withTenant(DELETE_);

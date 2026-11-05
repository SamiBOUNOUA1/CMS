// @ts-nocheck
// POST /api/cron/reminders: daily reminder emails for all tenants.
// Called by Cloud Scheduler with "Authorization: Bearer <CRON_SECRET>".
// This route is public in middleware.ts and checks the secret itself.
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runReminders } from '@/lib/jobs/reminders';
import { serverError } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return serverError(err, { route: '/api/cron/reminders' });
  }
}

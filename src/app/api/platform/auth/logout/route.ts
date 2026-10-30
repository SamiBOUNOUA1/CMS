// @ts-nocheck
import { NextResponse } from 'next/server';
import { PLATFORM_COOKIE, cookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLATFORM_COOKIE, '', cookieOptions(0));
  return res;
}

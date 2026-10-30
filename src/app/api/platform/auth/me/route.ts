// @ts-nocheck
import { NextResponse } from 'next/server';
import { withPlatformAdmin } from '@/lib/requireAuth';

export const GET = withPlatformAdmin(async (_request, _ctx, admin) => NextResponse.json({ admin }));

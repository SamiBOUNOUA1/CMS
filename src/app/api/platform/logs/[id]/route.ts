// @ts-nocheck
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { SystemLog } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export const GET = withPlatformAdmin(async (_req, { params }) => {
  if (!mongoose.isValidObjectId(params.id)) return notFound();
  await connectDB();
  const log = await SystemLog.findById(params.id).lean();
  return log ? NextResponse.json({ log }) : notFound();
});

// PATCH { resolved: boolean }
export const PATCH = withPlatformAdmin(async (request, { params }) => {
  if (!mongoose.isValidObjectId(params.id)) return notFound();
  await connectDB();
  const body = await request.json().catch(() => ({}));
  if (typeof body.resolved !== 'boolean') {
    return NextResponse.json({ error: 'resolved (boolean) is required' }, { status: 400 });
  }
  const log = await SystemLog.findByIdAndUpdate(
    params.id,
    { $set: { resolved: body.resolved, resolvedAt: body.resolved ? new Date() : null } },
    { new: true },
  ).lean();
  return log ? NextResponse.json({ log }) : notFound();
});

export const DELETE = withPlatformAdmin(async (_req, { params }) => {
  if (!mongoose.isValidObjectId(params.id)) return notFound();
  await connectDB();
  const r = await SystemLog.findByIdAndDelete(params.id);
  return r ? NextResponse.json({ ok: true }) : notFound();
});

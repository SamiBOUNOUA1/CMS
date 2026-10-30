// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Plan, Tenant } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { invalidateTenantLicense } from '@/lib/license';
import { cleanPlanInput } from '@/lib/planHelpers';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export const PATCH = withPlatformAdmin(async (request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const plan = await Plan.findByIdAndUpdate(params.id, { $set: cleanPlanInput(await request.json()) }, { new: true }).lean();
  if (!plan) return notFound();
  // Limits changed → drop cached licenses of tenants on this plan.
  const tenants = await Tenant.find({ plan: params.id }).select('_id').lean();
  tenants.forEach(t => invalidateTenantLicense(String(t._id)));
  return NextResponse.json({ plan });
});

export const DELETE = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  if (await Tenant.exists({ plan: params.id }))
    return NextResponse.json({ error: 'Plan is assigned to tenants; reassign them first' }, { status: 400 });
  await Plan.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
});

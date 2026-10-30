// @ts-nocheck
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Plan, Tenant } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { cleanPlanInput } from '@/lib/planHelpers';

export const GET = withPlatformAdmin(async () => {
  await connectDB();
  const [plans, usage] = await Promise.all([
    Plan.find().sort({ createdAt: 1 }).lean(),
    Tenant.aggregate([{ $group: { _id: '$plan', n: { $sum: 1 } } }]),
  ]);
  const usageMap = Object.fromEntries(usage.map(u => [String(u._id), u.n]));
  return NextResponse.json({ plans: plans.map(p => ({ ...p, tenantCount: usageMap[String(p._id)] ?? 0 })) });
});

export const POST = withPlatformAdmin(async (request) => {
  await connectDB();
  const data = cleanPlanInput(await request.json());
  if (!data.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  try {
    const plan = await Plan.create(data);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) return NextResponse.json({ error: 'A plan with this name already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

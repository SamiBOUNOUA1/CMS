// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TenantContract } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { createDraftContract, OPEN_STATUSES } from '@/lib/contractService';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

// All contracts of a tenant, newest first (history included).
export const GET = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const contracts = await TenantContract.find({ tenant: params.id })
    .select('-body -renderedBody -snapshot')
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ contracts });
});

// Starts a new draft. Only one contract can be in progress at a time.
export const POST = withPlatformAdmin(async (request, { params }, admin) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const open = await TenantContract.exists({ tenant: params.id, status: { $in: OPEN_STATUSES } });
  if (open) return NextResponse.json({ error: 'This tenant already has a contract in progress. Cancel it first.' }, { status: 409 });
  const b = await request.json().catch(() => ({}));
  try {
    const contract = await createDraftContract(params.id, { language: b.language, by: admin.name });
    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) {
    if (err?.status === 404) return notFound();
    throw err;
  }
});

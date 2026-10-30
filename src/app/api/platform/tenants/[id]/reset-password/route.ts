// @ts-nocheck
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { runAsSystem } from '@/lib/tenantContext';

// Lets the operator restore access for a locked-out tenant admin without ever
// seeing the tenant's business data. Only admin accounts can be reset.
export const POST = withPlatformAdmin(async (request, { params }) => {
  const { userId, password } = await request.json();
  if (![params.id, userId].every(id => mongoose.Types.ObjectId.isValid(id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!password || String(password).length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  await connectDB();
  const passwordHash = await hash(password, 12);
  const res = await runAsSystem(() => User.updateOne(
    { _id: userId, tenantId: params.id, role: 'admin' },
    { $set: { passwordHash, isActive: true } },
  ));
  if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});

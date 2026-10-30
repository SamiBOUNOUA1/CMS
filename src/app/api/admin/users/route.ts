// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { userLimitError, getTenantLicense } from '@/lib/license';
import { getTenantId } from '@/lib/tenantContext';

async function GET_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    const { maxUsers } = await getTenantLicense(getTenantId());
    return NextResponse.json({ users, maxUsers });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

async function POST_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const { name, email, password, role } = await request.json();
    if (!name || !email || !password)
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });

    const limitErr = await userLimitError();
    if (limitErr) return limitErr;

    const passwordHash = await hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: role || 'viewer' });
    return NextResponse.json(
      { user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt } },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err.code === 11000) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);

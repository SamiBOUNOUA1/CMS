// @ts-nocheck
import { withPlatformAdmin } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';

// Self-service password change for the signed-in platform operator.
// Requires the current password for verification.
export const POST = withPlatformAdmin(async (request: NextRequest, _ctx, admin) => {
  try {
    await connectDB();
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || String(newPassword).length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const doc = await PlatformAdmin.findById(admin.adminId);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const valid = await compare(currentPassword || '', doc.passwordHash);
    if (!valid)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    doc.passwordHash = await hash(String(newPassword), 12);
    await doc.save();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});

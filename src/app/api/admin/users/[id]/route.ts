// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();
    const update = {};

    if (body.name) update.name = body.name;
    if (body.role) update.role = body.role;
    if (typeof body.isActive === 'boolean') update.isActive = body.isActive;
    if (body.password) update.passwordHash = await hash(body.password, 12);

    // Prevent demoting the last admin
    if (body.role && body.role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: params.id } });
      if (adminCount === 0) {
        const target = await User.findById(params.id);
        if (target?.role === 'admin')
          return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }
    }

    const user = await User.findByIdAndUpdate(params.id, update, { new: true }).select('-passwordHash');
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const requestingUserId = request.headers.get('x-user-id');

    if (params.id === requestingUserId)
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

    const target = await User.findById(params.id);
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1)
        return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 });
    }

    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

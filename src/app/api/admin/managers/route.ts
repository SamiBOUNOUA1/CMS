// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';

// GET /api/admin/managers — list all active users (assignable to an event team)
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!auth.permissions.manage_users && !auth.permissions.edit_orders) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const managers = await User.find({ isActive: true })
      .select('_id name email role')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ managers });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

// GET /api/admin/managers — list all active users with role=manager
export async function GET(request) {
  const permsRaw = request.headers.get('x-user-permissions');
  const perms = permsRaw ? JSON.parse(permsRaw) : {};

  if (!perms.manage_users && !perms.edit_orders) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const managers = await User.find({ role: 'manager', isActive: true })
      .select('_id name email')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ managers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

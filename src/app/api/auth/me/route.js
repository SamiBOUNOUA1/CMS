import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
  try {
    await connectDB();
    const id = request.headers.get('x-user-id');
    const permissionsHeader = request.headers.get('x-user-permissions');
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const permissions = permissionsHeader ? JSON.parse(permissionsHeader) : {};
    return NextResponse.json({ user: { ...user, permissions } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

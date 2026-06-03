// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const id = request.headers.get('x-user-id');
    const permissionsHeader = request.headers.get('x-user-permissions');
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const permissions = permissionsHeader ? JSON.parse(permissionsHeader) : {};
    return NextResponse.json({ user: { ...user, permissions } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

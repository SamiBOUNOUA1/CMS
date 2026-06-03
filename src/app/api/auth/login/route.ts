// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User, RolePermissions } from '@/lib/models';
import { signToken, cookieOptions, COOKIE } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password)
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const roleDoc = await RolePermissions.findOne({ role: user.role }).lean();
    const permissions = buildPermissions(user.role, roleDoc?.permissions);

    const token = await signToken({ id: user._id.toString(), role: user.role, name: user.name, permissions });

    const res = NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions } });
    res.cookies.set(COOKIE, token, cookieOptions());
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

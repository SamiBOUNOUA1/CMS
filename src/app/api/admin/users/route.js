import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { name, email, password, role } = await request.json();
    if (!name || !email || !password)
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });

    const passwordHash = await hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: role || 'viewer' });
    return NextResponse.json(
      { user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt } },
      { status: 201 }
    );
  } catch (err) {
    if (err.code === 11000) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

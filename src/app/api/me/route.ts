// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

// Returns the currently authenticated user's profile.
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const id = request.headers.get('x-user-id');
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// Self-service update of the authenticated user's own profile.
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const id = request.headers.get('x-user-id');
    if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      user.name = name;
    }

    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      user.email = email;
    }

    if (body.preferredLanguage !== undefined) {
      if (!['en', 'fr'].includes(body.preferredLanguage))
        return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
      user.preferredLanguage = body.preferredLanguage;
    }

    // Password change requires the current password for verification.
    if (body.newPassword) {
      if (String(body.newPassword).length < 8)
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      const valid = await compare(body.currentPassword || '', user.passwordHash);
      if (!valid)
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      user.passwordHash = await hash(body.newPassword, 12);
    }

    await user.save();
    const safe = user.toObject();
    delete safe.passwordHash;
    return NextResponse.json({ user: safe });
  } catch (err: unknown) {
    if (err?.code === 11000) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

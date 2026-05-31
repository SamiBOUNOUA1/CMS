import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { StaffRoleConfig } from '@/lib/models';

// GET /api/settings/staff-roles
export async function GET() {
  try {
    await connectDB();
    const roles = await StaffRoleConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ roles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/settings/staff-roles
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { label, isActive = true } = body;

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const key = label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await StaffRoleConfig.findOne({ key });
    if (existing) {
      return NextResponse.json({ error: 'A staff role with this name already exists' }, { status: 409 });
    }

    const maxOrder = await StaffRoleConfig.findOne().sort({ sortOrder: -1 }).lean();
    const sortOrder = maxOrder ? maxOrder.sortOrder + 1 : 0;

    const role = await StaffRoleConfig.create({ key, label: label.trim(), isActive, sortOrder });
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

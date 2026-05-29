import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Role, User } from '@/lib/models';

// GET /api/admin/roles — list all roles sorted by sortOrder
export async function GET() {
  try {
    await connectDB();
    const roles = await Role.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ roles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/roles — create a new role
// Body: { label: string, isDefault?: boolean }
export async function POST(request) {
  try {
    await connectDB();
    const { label, isDefault } = await request.json();

    if (!label || !label.trim())
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });

    const name = label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name)
      return NextResponse.json({ error: 'Label must contain valid characters' }, { status: 400 });

    const maxOrder = await Role.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    const sortOrder = (maxOrder?.sortOrder ?? 0) + 1;

    if (isDefault) {
      await Role.updateMany({}, { $set: { isDefault: false } });
    }

    const role = await Role.create({ name, label: label.trim(), isDefault: !!isDefault, isSystem: false, sortOrder });
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) return NextResponse.json({ error: 'A role with that name already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

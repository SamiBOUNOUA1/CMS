import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { LaundryBatch } from '@/lib/models';

export async function GET(request: NextRequest) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.view_laundry) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { batchNumber: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const batches = await LaundryBatch.find(filter)
    .populate('items.inventoryItem', 'name unit')
    .populate('order', 'clientName eventDate')
    .populate('createdBy', 'name')
    .sort({ date: -1 })
    .lean();

  return NextResponse.json({ batches });
}

export async function POST(request: NextRequest) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.manage_laundry) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const body = await request.json();
  const { date, order, notes, items } = body;

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
  }
  for (const item of items) {
    if (!item.inventoryItem) {
      return NextResponse.json({ error: 'Each item must reference an inventory item' }, { status: 400 });
    }
    if (!item.quantitySent || item.quantitySent < 1) {
      return NextResponse.json({ error: 'Each item must have quantitySent >= 1' }, { status: 400 });
    }
  }

  const year = new Date(date).getFullYear();
  const count = await LaundryBatch.countDocuments({
    batchNumber: { $regex: `^LB-${year}-` },
  });
  const batchNumber = `LB-${year}-${String(count + 1).padStart(3, '0')}`;

  const userId = request.headers.get('x-user-id');

  const batch = await LaundryBatch.create({
    batchNumber,
    date,
    order: order || null,
    notes: notes || '',
    items: items.map((it: Record<string, unknown>) => ({
      inventoryItem: it.inventoryItem,
      quantitySent: it.quantitySent,
      quantityReturned: 0,
      quantityLost: 0,
      quantityDamaged: 0,
      notes: it.notes || '',
    })),
    createdBy: userId || null,
    status: 'draft',
  });

  const populated = await LaundryBatch.findById(batch._id)
    .populate('items.inventoryItem', 'name unit')
    .populate('order', 'clientName eventDate')
    .populate('createdBy', 'name')
    .lean();

  return NextResponse.json({ batch: populated }, { status: 201 });
}

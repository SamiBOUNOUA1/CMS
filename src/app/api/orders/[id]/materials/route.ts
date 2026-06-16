// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

function getPerms(request: NextRequest) {
  const header = request.headers.get('x-user-permissions');
  return header ? JSON.parse(header) : {};
}

// Returns the order's materials with the linked inventory item populated for display
async function loadMaterials(id: string) {
  const order = await Order.findById(id)
    .select('clientName eventType eventDate materials')
    .populate('materials.inventoryItem', 'name imageUrl unit currentStock')
    .populate('materials.checkedBy', 'name')
    .populate('materials.missingBy', 'name')
    .lean();
  return order;
}

// GET /api/orders/[id]/materials — view the event materials checklist
// Readable by any authenticated user who can reach the event (prep + managers).
export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const order = await loadMaterials(params.id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Drop entries whose inventory item was deleted so the UI never renders blanks
    const materials = (order.materials ?? []).filter((m: any) => m.inventoryItem);

    return NextResponse.json({
      order: {
        _id: order._id,
        clientName: order.clientName,
        eventType: order.eventType,
        eventDate: order.eventDate,
      },
      materials,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PUT /api/orders/[id]/materials — replace the whole list (admin CRUD)
// Guarded by manage_event_materials in middleware; re-checked here as defense.
export async function PUT(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    if (!getPerms(request).manage_event_materials) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const body = await request.json();
    const incoming = Array.isArray(body.materials) ? body.materials : [];

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Preserve existing check state for items that remain in the list (match by inventory item)
    const prev = new Map(
      (order.materials ?? []).map((m: any) => [String(m.inventoryItem), m])
    );

    order.materials = incoming
      .filter((m: any) => m.inventoryItem)
      .map((m: any) => {
        const existing = prev.get(String(m.inventoryItem));
        return {
          inventoryItem: m.inventoryItem,
          quantity: Math.max(0, Number(m.quantity) || 0),
          checked: existing?.checked ?? false,
          checkedBy: existing?.checkedBy ?? null,
          checkedAt: existing?.checkedAt ?? null,
          missing: existing?.missing ?? false,
          missingBy: existing?.missingBy ?? null,
          missingAt: existing?.missingAt ?? null,
        };
      });

    await order.save();
    const updated = await loadMaterials(params.id);
    return NextResponse.json({ materials: (updated?.materials ?? []).filter((m: any) => m.inventoryItem) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/materials — set a material's received/checked or missing status.
// `checked` and `missing` are mutually exclusive: turning one on clears the other.
// Guarded by check_event_materials in middleware; re-checked here as defense.
export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    if (!getPerms(request).check_event_materials) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { materialId, checked, missing } = await request.json();

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const material = order.materials.id(materialId);
    if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

    const userId = request.headers.get('x-user-id');
    const now = new Date();

    if (checked !== undefined) {
      material.checked = !!checked;
      material.checkedBy = checked ? userId : null;
      material.checkedAt = checked ? now : null;
      if (checked) { material.missing = false; material.missingBy = null; material.missingAt = null; }
    }

    if (missing !== undefined) {
      material.missing = !!missing;
      material.missingBy = missing ? userId : null;
      material.missingAt = missing ? now : null;
      if (missing) { material.checked = false; material.checkedBy = null; material.checkedAt = null; }
    }

    await order.save();
    const updated = await loadMaterials(params.id);
    return NextResponse.json({ materials: (updated?.materials ?? []).filter((m: any) => m.inventoryItem) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

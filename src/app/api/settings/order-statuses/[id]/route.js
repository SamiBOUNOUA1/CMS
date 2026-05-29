import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { OrderStatusConfig } from '@/lib/models';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const body = await request.json();

    // If setting triggerEvent=true, clear it on all others first
    if (body.triggerEvent === true) {
      await OrderStatusConfig.updateMany({ _id: { $ne: params.id } }, { $set: { triggerEvent: false } });
    }

    const status = await OrderStatusConfig.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true }
    );
    if (!status) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const status = await OrderStatusConfig.findById(params.id);
    if (!status) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (status.isSystem) return NextResponse.json({ error: 'Cannot delete system status' }, { status: 400 });
    await status.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Activity } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'view_activities');
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10));
    const skip  = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('performedBy', 'name')
        .lean(),
      Activity.countDocuments(),
    ]);

    return NextResponse.json({
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

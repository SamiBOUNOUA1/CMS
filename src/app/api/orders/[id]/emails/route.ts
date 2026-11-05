// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EmailLog } from '@/lib/models';
import { serverError } from '@/lib/logger';

// GET /api/orders/:id/emails: emails sent for this order, newest first
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'view_orders');
    if (error) return error;
    await connectDB();
    const emails = await EmailLog.find({ order: params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('type to subject status error trigger createdAt')
      .lean();
    return NextResponse.json({ emails });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);

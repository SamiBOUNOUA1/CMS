// @ts-nocheck
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { SupportCase, PlatformAdmin } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { runAsSystem } from '@/lib/tenantContext';
import { serverError } from '@/lib/logger';
import { isCasePriority, isCaseStatus, statusDates } from '@/lib/supportCases';
import { loadPlatformCase } from '@/lib/supportCasesServer';

const notFound = () => NextResponse.json({ error: 'Case not found' }, { status: 404 });

export const GET = withPlatformAdmin(async (_request, { params }) => {
  try {
    if (!mongoose.isValidObjectId(params.id)) return notFound();
    await connectDB();
    const data = await loadPlatformCase(params.id);
    if (!data) return notFound();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return serverError(err);
  }
});

// PATCH { status?, priority?, assignedTo? (id | null) }
export const PATCH = withPlatformAdmin(async (request, { params }) => {
  try {
    if (!mongoose.isValidObjectId(params.id)) return notFound();
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const $set: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!isCaseStatus(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      $set.status = body.status;
      const d = statusDates(body.status);
      if (d.resolvedAt !== undefined) $set.resolvedAt = d.resolvedAt;
      $set.closedAt = d.closedAt;
    }
    if (body.priority !== undefined) {
      if (!isCasePriority(body.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
      $set.priority = body.priority;
    }
    if (body.assignedTo !== undefined) {
      if (body.assignedTo === null || body.assignedTo === '') $set.assignedTo = null;
      else {
        if (!mongoose.isValidObjectId(body.assignedTo)) return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 });
        const exists = await PlatformAdmin.exists({ _id: body.assignedTo, isActive: true });
        if (!exists) return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 });
        $set.assignedTo = body.assignedTo;
      }
    }
    if (!Object.keys($set).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const ok = await runAsSystem(() => SupportCase.updateOne({ _id: params.id }, { $set }, { runValidators: true }));
    if (!ok.matchedCount) return notFound();
    return NextResponse.json(await loadPlatformCase(params.id));
  } catch (err: unknown) {
    return serverError(err);
  }
});

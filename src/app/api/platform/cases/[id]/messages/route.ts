// @ts-nocheck
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { SupportCase } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { runAsSystem } from '@/lib/tenantContext';
import { serverError } from '@/lib/logger';
import {
  CASE_MAX_MESSAGES, cleanCaseBody, isCaseStatus, statusAfterPlatformReply, statusDates,
} from '@/lib/supportCases';
import { loadPlatformCase } from '@/lib/supportCasesServer';

const notFound = () => NextResponse.json({ error: 'Case not found' }, { status: 404 });

// POST { body, internal?: boolean, status?: CaseStatus }
//  internal → operator-only note (never shown to the tenant)
//  otherwise → public reply; optional status applied with it (e.g. waiting_tenant).
export const POST = withPlatformAdmin(async (request, { params }, admin) => {
  try {
    if (!mongoose.isValidObjectId(params.id)) return notFound();
    await connectDB();
    const payload = await request.json().catch(() => ({}));
    const { body, error: bodyError } = cleanCaseBody(payload.body);
    if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 });
    const now = new Date();
    const author = { authorId: admin.adminId, authorName: admin.name, body, createdAt: now };

    if (payload.internal === true) {
      const ok = await runAsSystem(() => SupportCase.updateOne(
        { _id: params.id },
        { $push: { internalNotes: author } },
        { runValidators: true },
      ));
      if (!ok.matchedCount) return notFound();
      return NextResponse.json(await loadPlatformCase(params.id), { status: 201 });
    }

    if (payload.status !== undefined && payload.status !== null && !isCaseStatus(payload.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const current = await runAsSystem(() => SupportCase.findById(params.id).select('status messages._id').lean());
    if (!current) return notFound();
    if ((current.messages?.length ?? 0) >= CASE_MAX_MESSAGES) {
      return NextResponse.json({ error: 'This case has reached its message limit.' }, { status: 400 });
    }

    const status = statusAfterPlatformReply(current.status, payload.status || null);
    const $set: Record<string, unknown> = { status, lastMessageAt: now, lastMessageBy: 'platform' };
    if (status !== current.status) {
      const d = statusDates(status, now);
      if (d.resolvedAt !== undefined) $set.resolvedAt = d.resolvedAt;
      $set.closedAt = d.closedAt;
    }

    const ok = await runAsSystem(() => SupportCase.updateOne(
      { _id: params.id, status: current.status },
      { $push: { messages: { authorType: 'platform', ...author } }, $set },
      { runValidators: true },
    ));
    if (!ok.matchedCount) return NextResponse.json({ error: 'The case was just updated. Please try again.' }, { status: 409 });
    return NextResponse.json(await loadPlatformCase(params.id), { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
});

// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { withTenant, requireAnyPermission } from '@/lib/requireAuth';
import { connectDB } from '@/lib/mongodb';
import { SupportCase, User } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { CASE_MAX_MESSAGES, cleanCaseBody, statusAfterTenantReply } from '@/lib/supportCases';
import { caseScope, isObjectId, toTenantCase } from '@/lib/supportCasesServer';

const notFound = () => NextResponse.json({ error: 'Case not found' }, { status: 404 });

/** Tenant reply on a case. */
async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requireAnyPermission(request, ['create_cases', 'view_all_cases']);
    if (error) return error;
    if (!isObjectId(params.id)) return notFound();
    await connectDB();

    const payload = await request.json().catch(() => ({}));
    const { body, error: bodyError } = cleanCaseBody(payload.body);
    if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 });

    const filter = { _id: params.id, ...caseScope(auth) };
    const current = await SupportCase.findOne(filter).select('status messages._id').lean();
    if (!current) return notFound();
    if (current.status === 'closed') {
      return NextResponse.json({ error: 'This case is closed. Please open a new case.' }, { status: 400 });
    }
    if ((current.messages?.length ?? 0) >= CASE_MAX_MESSAGES) {
      return NextResponse.json({ error: 'This case has reached its message limit. Please open a new case.' }, { status: 400 });
    }

    const user = await User.findById(auth.userId).select('name').lean();
    const now = new Date();
    // Conditional on the status we read, so a concurrent status change is not overwritten.
    const updated = await SupportCase.findOneAndUpdate(
      { ...filter, status: current.status },
      {
        $push: { messages: { authorType: 'tenant', authorId: auth.userId, authorName: user?.name ?? '', body, createdAt: now } },
        $set: { status: statusAfterTenantReply(current.status), lastMessageAt: now, lastMessageBy: 'tenant' },
      },
      { new: true, runValidators: true },
    ).lean();
    if (!updated) return NextResponse.json({ error: 'The case was just updated. Please try again.' }, { status: 409 });

    return NextResponse.json({ case: toTenantCase(updated) }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const POST = withTenant(POST_);

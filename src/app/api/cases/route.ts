// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { withTenant, requirePermission, requireAnyPermission } from '@/lib/requireAuth';
import { connectDB } from '@/lib/mongodb';
import { SupportCase, User } from '@/lib/models';
import { safeRegex } from '@/lib/security';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';
import { getTenantLicense } from '@/lib/license';
import { logActivity } from '@/lib/activityLogger';
import {
  ACTIVE_CASE_STATUSES, CASE_SUBJECT_MAX, cleanCaseBody,
  isCaseCategory, isCasePriority, isCaseStatus,
} from '@/lib/supportCases';
import { caseScope, nextCaseNumber, toTenantCase } from '@/lib/supportCasesServer';

const LIST_FIELDS = 'caseNumber subject category priority status createdBy createdByName lastMessageAt lastMessageBy createdAt';

async function GET_(request: NextRequest) {
  try {
    const { auth, error } = await requireAnyPermission(request, ['create_cases', 'view_all_cases']);
    if (error) return error;
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? '';
    const q = (searchParams.get('q') ?? '').trim();

    const query: Record<string, unknown> = { ...caseScope(auth) };
    if (status === 'active') query.status = { $in: ACTIVE_CASE_STATUSES };
    else if (isCaseStatus(status)) query.status = status;
    if (q) query.$or = [{ subject: safeRegex(q) }, { caseNumber: safeRegex(q) }];

    const pg = parsePagination(searchParams);
    let find = SupportCase.find(query).select(LIST_FIELDS).sort({ lastMessageAt: -1 }).lean();
    if (pg) find = find.skip(pg.skip).limit(pg.limit);
    const [cases, total, awaitingYou] = await Promise.all([
      find,
      pg ? SupportCase.countDocuments(query) : null,
      SupportCase.countDocuments({ ...caseScope(auth), status: 'waiting_tenant' }),
    ]);
    const summary = { awaitingYou };
    if (!pg) return NextResponse.json({ cases, summary });
    return NextResponse.json({ cases, summary, ...pageMeta(total, pg) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function POST_(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'create_cases');
    if (error) return error;
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    if (subject.length > CASE_SUBJECT_MAX) {
      return NextResponse.json({ error: `Subject is too long (max ${CASE_SUBJECT_MAX} characters)` }, { status: 400 });
    }
    const { body: description, error: bodyError } = cleanCaseBody(body.description);
    if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 });
    const category = isCaseCategory(body.category) ? body.category : 'other';
    const priority = isCasePriority(body.priority) ? body.priority : 'normal';

    const [user, license] = await Promise.all([
      User.findById(auth.userId).select('name').lean(),
      getTenantLicense(auth.tenantId),
    ]);
    const authorName = user?.name ?? '';
    const now = new Date();

    const created = await SupportCase.create({
      caseNumber: await nextCaseNumber(now),
      tenantName: license?.name ?? '',
      subject,
      category,
      priority,
      status: 'open',
      createdBy: auth.userId,
      createdByName: authorName,
      messages: [{ authorType: 'tenant', authorId: auth.userId, authorName, body: description, createdAt: now }],
      lastMessageAt: now,
      lastMessageBy: 'tenant',
    });

    await logActivity({
      action: 'case_created',
      entityType: 'supportCase',
      entityId: String(created._id),
      entityLabel: `${created.caseNumber} — ${subject}`,
      performedBy: auth.userId,
      metadata: { caseNumber: created.caseNumber, category, priority },
    });

    return NextResponse.json({ case: toTenantCase(created.toObject()) }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);

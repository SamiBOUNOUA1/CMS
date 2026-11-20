// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { withTenant, requireAnyPermission } from '@/lib/requireAuth';
import { connectDB } from '@/lib/mongodb';
import { SupportCase } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { caseScope, isObjectId, toTenantCase } from '@/lib/supportCasesServer';

const notFound = () => NextResponse.json({ error: 'Case not found' }, { status: 404 });

async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requireAnyPermission(request, ['create_cases', 'view_all_cases']);
    if (error) return error;
    if (!isObjectId(params.id)) return notFound();
    await connectDB();

    // internalNotes is select:false on the schema, so it is never loaded here.
    const c = await SupportCase.findOne({ _id: params.id, ...caseScope(auth) }).lean();
    if (!c) return notFound();
    return NextResponse.json({ case: toTenantCase(c) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

/** Tenant-side actions on a case. Only `close` for now. */
async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requireAnyPermission(request, ['create_cases', 'view_all_cases']);
    if (error) return error;
    if (!isObjectId(params.id)) return notFound();
    await connectDB();

    const body = await request.json().catch(() => ({}));
    if (body.action !== 'close') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

    const c = await SupportCase.findOne({ _id: params.id, ...caseScope(auth) });
    if (!c) return notFound();
    if (c.status === 'closed') return NextResponse.json({ error: 'Case is already closed' }, { status: 400 });

    c.status = 'closed';
    c.closedAt = new Date();
    await c.save();
    return NextResponse.json({ case: toTenantCase(c.toObject()) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);

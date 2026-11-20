// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TenantContract } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { renderPagePdf } from '@/lib/pdf';
import { slugify } from '@/lib/tenantProvisioning';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Downloads the contract as a PDF (drafts are watermarked). Rendered from the
// print page with the operator's own session cookie.
export const GET = withPlatformAdmin(async (request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await connectDB();
  const contract = await TenantContract.findById(params.id).select('number tenantName status').lean();
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = request.cookies.get('cq_platform_token')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pdf = await renderPagePdf(request.nextUrl.origin, `/platform/contracts/${params.id}/print`, {
    cookie: { name: 'cq_platform_token', value: session },
  });
  const base = contract.number || `draft-${slugify(contract.tenantName || 'contract')}`;
  const inline = request.nextUrl.searchParams.get('inline') === '1';
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${base}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
});

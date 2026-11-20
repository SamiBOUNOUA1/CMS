// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TenantContract } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { getBucket } from '@/lib/storage';
import { logWarn } from '@/lib/logger';
import { event, MAX_SIGNED_PDF, signedObjectPath } from '@/lib/contractService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

async function load(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return TenantContract.findById(id).lean();
}

// Uploads the signed copy (PDF only). Re-uploading replaces the previous file.
export const POST = withPlatformAdmin(async (request, { params }, admin) => {
  const contract = await load(params.id);
  if (!contract) return notFound();
  if (!['issued', 'signed'].includes(contract.status))
    return NextResponse.json({ error: 'Finalize the contract before uploading the signed copy' }, { status: 409 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return bad('No file provided');
  if (file.size > MAX_SIGNED_PDF) return bad('File too large. Maximum size is 10 MB.');
  if (file.type && file.type !== 'application/pdf') return bad('Only PDF files are accepted');
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_SIGNED_PDF) return bad('File too large. Maximum size is 10 MB.');
  // The declared type is only a claim: a PDF starts with "%PDF-".
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') return bad('Only PDF files are accepted');

  const objectPath = signedObjectPath(String(contract.tenant), String(contract._id));
  await getBucket().file(objectPath).save(buffer, { resumable: false, contentType: 'application/pdf' });

  const originalName = String(file.name || 'signed.pdf').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  const updated = await TenantContract.findOneAndUpdate(
    { _id: contract._id, status: { $in: ['issued', 'signed'] } },
    {
      $set: {
        status: 'signed',
        signedFile: { objectPath, originalName, size: buffer.byteLength, uploadedAt: new Date(), uploadedBy: admin.name },
      },
      $push: { events: event(contract.status === 'signed' ? 'signed_replaced' : 'signed_uploaded', admin.name, originalName) },
    },
    { new: true },
  ).lean();
  if (!updated) {
    await getBucket().file(objectPath).delete({ ignoreNotFound: true }).catch(() => {});
    return NextResponse.json({ error: 'The contract changed meanwhile, reload the page' }, { status: 409 });
  }
  const previous = contract.signedFile?.objectPath;
  if (previous && previous !== objectPath) {
    await getBucket().file(previous).delete({ ignoreNotFound: true })
      .catch(err => logWarn(`Could not delete replaced contract file: ${err?.message}`));
  }
  return NextResponse.json({ contract: updated });
});

// Streams the signed copy (the bucket stays private).
export const GET = withPlatformAdmin(async (request, { params }) => {
  const contract = await load(params.id);
  if (!contract?.signedFile?.objectPath) return notFound();
  const f = getBucket().file(contract.signedFile.objectPath);
  const [exists] = await f.exists();
  if (!exists) return notFound();
  const [buf] = await f.download();
  const name = `${contract.number || 'contract'}-signed.pdf`;
  const download = request.nextUrl.searchParams.get('download') === '1';
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

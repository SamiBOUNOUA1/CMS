// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant, TenantContract } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { invalidateTenantLicense } from '@/lib/license';
import { getBucket } from '@/lib/storage';
import { logWarn } from '@/lib/logger';
import { getPlatformSettings } from '@/lib/platformSettings';
import { buildValues, fillPlaceholders, missingValues } from '@/lib/contracts';
import { asLang, event, liveValues, nextContractNumber, printableContract } from '@/lib/contractService';

const MAX_BODY = 100_000;
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
const conflict = (error: string) => NextResponse.json({ error }, { status: 409 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

async function load(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return TenantContract.findById(id).lean();
}

// Contract + its rendered preview. For drafts, also lists required values that
// are still missing (finalizing is blocked until they are filled in).
export const GET = withPlatformAdmin(async (_request, { params }) => {
  const contract = await load(params.id);
  if (!contract) return notFound();
  const preview = await printableContract(contract);
  const missing = contract.status === 'draft' ? missingValues(contract.body, preview.values) : [];
  return NextResponse.json({ contract, preview, missing });
});

// Edits a draft: body text and/or language. Changing the language with
// resetBody: true reloads that language's template.
export const PATCH = withPlatformAdmin(async (request, { params }) => {
  const contract = await load(params.id);
  if (!contract) return notFound();
  if (contract.status !== 'draft') return conflict('Only a draft contract can be edited');
  const b = await request.json().catch(() => ({}));
  const set: Record<string, unknown> = {};
  if (b.language !== undefined) set.language = asLang(b.language, contract.language);
  if (typeof b.body === 'string') {
    if (b.body.length > MAX_BODY) return bad('Contract text is too long');
    set.body = b.body;
  }
  if (b.resetBody) {
    const { contractTemplates } = await getPlatformSettings();
    set.body = contractTemplates[set.language ?? contract.language];
  }
  const updated = await TenantContract.findOneAndUpdate(
    { _id: contract._id, status: 'draft' }, { $set: set }, { new: true },
  ).lean();
  if (!updated) return conflict('Only a draft contract can be edited');
  return NextResponse.json({ contract: updated });
});

// Lifecycle actions: issue | confirm | reject | cancel.
export const POST = withPlatformAdmin(async (request, { params }, admin) => {
  const contract = await load(params.id);
  if (!contract) return notFound();
  const b = await request.json().catch(() => ({}));
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : '';

  switch (b.action) {
    // Freezes the text and values, assigns the contract number.
    case 'issue': {
      if (contract.status !== 'draft') return conflict('This contract is already finalized');
      const { values: probe } = await liveValues(contract);
      const missing = missingValues(contract.body, probe);
      if (missing.length) {
        return NextResponse.json({ error: `Fill in the missing details first: ${missing.join(', ')}`, missing }, { status: 400 });
      }
      const issuedAt = new Date();
      const number = await nextContractNumber(issuedAt);
      const { tenant, issuer } = await liveValues(contract);
      const plan = tenant?.plan && typeof tenant.plan === 'object' ? tenant.plan : null;
      const values = buildValues({ tenant, plan, issuer, contract: { number, issuedAt } }, contract.language);
      const updated = await TenantContract.findOneAndUpdate(
        { _id: contract._id, status: 'draft' },
        {
          $set: {
            status: 'issued', number, issuedAt,
            renderedBody: fillPlaceholders(contract.body, values),
            snapshot: {
              values,
              issuer,
              tenantLegal: tenant?.legal ?? {},
              plan: plan ? { name: plan.name, price: plan.price, currency: plan.currency, billingPeriod: plan.billingPeriod } : null,
              license: tenant?.license ?? null,
            },
          },
          $push: { events: event('issued', admin.name, number) },
        },
        { new: true },
      ).lean();
      if (!updated) return conflict('This contract is already finalized');
      return NextResponse.json({ contract: updated });
    }

    // Accepts the uploaded signed copy and opens access for a new tenant.
    case 'confirm': {
      if (contract.status !== 'signed' || !contract.signedFile?.objectPath)
        return conflict('Upload the signed contract before confirming it');
      const updated = await TenantContract.findOneAndUpdate(
        { _id: contract._id, status: 'signed' },
        {
          $set: {
            status: 'confirmed', confirmedAt: new Date(),
            confirmedBy: mongoose.Types.ObjectId.isValid(admin.adminId) ? admin.adminId : null,
          },
          $push: { events: event('confirmed', admin.name, note) },
        },
        { new: true },
      ).lean();
      if (!updated) return conflict('Upload the signed contract before confirming it');
      // Only lifts the contract block; a manual suspension stays in place.
      const res = await Tenant.updateOne({ _id: contract.tenant, status: 'pending_contract' }, { $set: { status: 'active' } });
      invalidateTenantLicense(String(contract.tenant));
      return NextResponse.json({ contract: updated, activated: res.modifiedCount > 0 });
    }

    // The uploaded copy is not acceptable (missing signature, wrong file…).
    case 'reject': {
      if (contract.status !== 'signed') return conflict('There is no signed copy to reject');
      if (!note) return bad('Give a reason for rejecting the signed copy');
      const updated = await TenantContract.findOneAndUpdate(
        { _id: contract._id, status: 'signed' },
        {
          $set: { status: 'issued', signedFile: { objectPath: null, originalName: '', size: 0, uploadedAt: null, uploadedBy: '' } },
          $push: { events: event('signed_rejected', admin.name, note) },
        },
        { new: true },
      ).lean();
      if (!updated) return conflict('There is no signed copy to reject');
      await deleteObject(contract.signedFile?.objectPath);
      return NextResponse.json({ contract: updated });
    }

    // Abandons a contract in progress (kept in history). A new draft can follow.
    case 'cancel': {
      if (!['draft', 'issued', 'signed'].includes(contract.status)) return conflict('This contract can no longer be cancelled');
      if (!note) return bad('Give a reason for cancelling the contract');
      const updated = await TenantContract.findOneAndUpdate(
        { _id: contract._id, status: contract.status },
        {
          $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: note },
          $push: { events: event('cancelled', admin.name, note) },
        },
        { new: true },
      ).lean();
      if (!updated) return conflict('The contract changed meanwhile, reload the page');
      return NextResponse.json({ contract: updated });
    }

    default:
      return bad('Unknown action');
  }
});

async function deleteObject(objectPath?: string | null) {
  if (!objectPath) return;
  try {
    await getBucket().file(objectPath).delete({ ignoreNotFound: true });
  } catch (err) {
    await logWarn(`Could not delete contract file: ${(err as Error)?.message}`);
  }
}


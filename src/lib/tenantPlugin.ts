// @ts-nocheck
import mongoose, { Schema } from 'mongoose';
import { getTenantStore } from '@/lib/tenantContext';

/**
 * Mongoose plugin that makes a schema tenant-owned:
 *  - adds a required, indexed `tenantId`;
 *  - scopes every query / aggregate / bulkWrite to the current tenant;
 *  - stamps `tenantId` on new documents (overriding any client-supplied value).
 *
 * It FAILS CLOSED: any operation run outside `runWithTenant` / `runAsSystem`
 * throws, so a route that forgot to set the context errors instead of leaking
 * another tenant's data. Under `runAsSystem` nothing is filtered.
 */

const QUERY_OPS = [
  'countDocuments', 'distinct', 'find', 'findOne',
  'findOneAndReplace', 'findOneAndUpdate', 'replaceOne', 'updateMany', 'updateOne',
  'deleteMany', 'deleteOne', 'findOneAndDelete',
];

/** Returns the tenant ObjectId to scope by, or null for system context. Throws when there is no context. */
function currentTenant(op: string): mongoose.Types.ObjectId | null {
  const store = getTenantStore();
  if (!store) throw new Error(`Tenant context missing for ${op}`);
  if ('system' in store) return null;
  return new mongoose.Types.ObjectId(store.tenantId);
}

function stripTenantFromUpdate(update) {
  if (!update || Array.isArray(update)) return;
  delete update.tenantId;
  for (const op of ['$set', '$setOnInsert', '$unset', '$inc', '$push', '$addToSet']) {
    if (update[op]) delete update[op].tenantId;
  }
}

export function tenantPlugin(schema: Schema) {
  schema.add({ tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true } });

  schema.pre(QUERY_OPS, function () {
    const tenantId = currentTenant(this.op);
    if (!tenantId) return;
    this.where({ tenantId });
    stripTenantFromUpdate(this.getUpdate());
    // Replacement docs (replaceOne / findOneAndReplace) must keep the tenant.
    if (this.op === 'replaceOne' || this.op === 'findOneAndReplace') {
      const replacement = this.getUpdate();
      if (replacement) replacement.tenantId = tenantId;
    }
  });

  schema.pre('estimatedDocumentCount', function () {
    if (currentTenant('estimatedDocumentCount'))
      throw new Error('estimatedDocumentCount cannot be tenant-scoped; use countDocuments');
  });

  schema.pre('aggregate', function () {
    const tenantId = currentTenant('aggregate');
    if (tenantId) this.pipeline().unshift({ $match: { tenantId } });
  });

  // Covers save(), create() and insertMany() (which validates each doc).
  schema.pre('validate', function () {
    const tenantId = currentTenant('save');
    if (tenantId) this.tenantId = tenantId;
  });

  schema.pre('insertMany', function (next, docs) {
    const tenantId = currentTenant('insertMany');
    if (tenantId) for (const d of [].concat(docs)) if (d) d.tenantId = tenantId;
    next();
  });

  schema.pre('bulkWrite', function (next, ops) {
    const tenantId = currentTenant('bulkWrite');
    if (tenantId) {
      for (const op of ops) {
        const [kind] = Object.keys(op);
        const body = op[kind];
        if (kind === 'insertOne') body.document.tenantId = tenantId;
        else {
          body.filter = { ...(body.filter || {}), tenantId };
          stripTenantFromUpdate(body.update);
          if (body.replacement) body.replacement.tenantId = tenantId;
        }
      }
    }
    next();
  });
}

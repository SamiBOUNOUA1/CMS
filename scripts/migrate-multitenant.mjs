/**
 * One-time migration to multi-tenancy: moves all existing (single-company) data
 * into a first Tenant so the current customer keeps working unchanged.
 *
 *  1. Creates an "Unlimited" plan (all modules, unlimited users) if no plan exists.
 *  2. Creates the Tenant (name from CompanySettings unless --name is given).
 *  3. Stamps `tenantId` on every document that doesn't have one, in every
 *     tenant-owned collection.
 *  4. Drops the old single-field unique indexes (e.g. roles.name_1) and creates
 *     the per-tenant compound ones ({ tenantId, name }).
 *  5. Copies Cloud Storage images inventory/* → tenants/<id>/inventory/*.
 *
 * Safe to re-run: documents that already have a tenantId are left alone and an
 * existing tenant with the same slug is reused.
 *
 * Usage:
 *   Development:  node scripts/migrate-multitenant.mjs [--name "Traiteur Mazar"] [--expires 2027-12-31] [--skip-storage]
 *   Production:   node scripts/migrate-multitenant.mjs --env production --confirm [...]
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const argVal = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
const environment = argVal('--env') ?? 'development';
const confirmed = args.includes('--confirm');
const skipStorage = args.includes('--skip-storage');
const isProd = environment === 'production';

const envFile = isProd ? '.env.production' : '.env';
config({ path: resolve(__dirname, `../${envFile}`) });

if (isProd && !confirmed) {
  console.error('ERROR: Production migration requires the --confirm flag.');
  console.error('  node scripts/migrate-multitenant.mjs --env production --confirm');
  process.exit(1);
}

import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(`MONGODB_URI not set in ${envFile}`);
  process.exit(1);
}

// Platform collections are not tenant-owned.
const PLATFORM_COLLECTIONS = new Set(['tenants', 'plans', 'platformadmins']);

// Old global unique indexes → new per-tenant compound keys (must match lib/models.ts).
const PER_TENANT_UNIQUE = {
  orderstatusconfigs: 'name',
  eventtypeconfigs: 'key',
  customertypeconfigs: 'key',
  staffroleconfigs: 'key',
  roles: 'name',
  rolepermissions: 'role',
  categories: 'name',
  products: 'name',
  invoices: 'invoiceNumber',
  moduleconfigs: 'moduleId',
  inventorycategories: 'name',
  laundrybatches: 'batchNumber',
};

const slugify = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'tenant';

console.log(`\nEnvironment : ${environment}`);
console.log(`Config file : ${envFile}\n`);

await mongoose.connect(uri);
const db = mongoose.connection.db;

// ── 1. Plan ──────────────────────────────────────────────────────────────────
const plans = db.collection('plans');
let plan = await plans.findOne({});
if (!plan) {
  const now = new Date();
  const doc = { name: 'Unlimited', maxUsers: 0, modules: ['inventory', 'tasks', 'laundry', 'kitchen', 'reports'], isActive: true, createdAt: now, updatedAt: now };
  const { insertedId } = await plans.insertOne(doc);
  plan = { ...doc, _id: insertedId };
  console.log('✓ Plan created: Unlimited');
}
await plans.createIndex({ name: 1 }, { unique: true });

// ── 2. Tenant ────────────────────────────────────────────────────────────────
const company = await db.collection('companysettings').findOne({ tenantId: { $exists: false } })
  ?? await db.collection('companysettings').findOne({});
const name = argVal('--name') || company?.companyName || 'My Company';
const slug = slugify(name);
const tenants = db.collection('tenants');
await tenants.createIndex({ slug: 1 }, { unique: true });

let tenant = await tenants.findOne({ slug });
if (tenant) {
  console.log(`  Tenant already exists: ${tenant.name} (${tenant._id})`);
} else {
  const expires = argVal('--expires') ? new Date(argVal('--expires')) : new Date(Date.now() + 365 * 24 * 3600 * 1000);
  if (Number.isNaN(expires.getTime())) { console.error('Invalid --expires date'); process.exit(1); }
  const now = new Date();
  const doc = {
    name, slug,
    contactName: '', contactEmail: (company?.email || '').toLowerCase(), contactPhone: company?.phone || '',
    status: 'active', plan: plan._id,
    overrides: { maxUsers: null, modules: null },
    license: { startsAt: now, expiresAt: expires },
    notes: 'Migrated from single-tenant installation', lastActivityAt: null,
    createdAt: now, updatedAt: now,
  };
  const { insertedId } = await tenants.insertOne(doc);
  tenant = { ...doc, _id: insertedId };
  console.log(`✓ Tenant created: ${name} (${insertedId}), license until ${expires.toISOString().slice(0, 10)}`);
}
const tenantId = tenant._id;

// ── 3. Stamp tenantId ────────────────────────────────────────────────────────
const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
  .map(c => c.name)
  .filter(n => !n.startsWith('system.') && !PLATFORM_COLLECTIONS.has(n));

for (const coll of collections) {
  const res = await db.collection(coll).updateMany({ tenantId: { $exists: false } }, { $set: { tenantId } });
  await db.collection(coll).createIndex({ tenantId: 1 });
  console.log(`  ${coll.padEnd(28)} ${res.modifiedCount} document(s) tagged`);
}

// ── 4. Unique indexes ────────────────────────────────────────────────────────
for (const [coll, field] of Object.entries(PER_TENANT_UNIQUE)) {
  if (!collections.includes(coll)) continue;
  const c = db.collection(coll);
  for (const idx of await c.indexes()) {
    const keys = Object.keys(idx.key);
    if (idx.unique && keys.length === 1 && keys[0] === field) {
      await c.dropIndex(idx.name);
      console.log(`✓ Dropped global unique index ${coll}.${idx.name}`);
    }
  }
  await c.createIndex({ tenantId: 1, [field]: 1 }, { unique: true });
}
console.log('✓ Per-tenant unique indexes in place');

// ── 5. Storage ───────────────────────────────────────────────────────────────
if (skipStorage) {
  console.log('\n  Skipping Cloud Storage copy (--skip-storage)');
} else {
  try {
    const { Storage } = await import('@google-cloud/storage');
    const bucketName = process.env.STORAGE_BUCKET;
    if (!bucketName) throw new Error('STORAGE_BUCKET not set');
    const bucket = new Storage().bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: 'inventory/' });
    let copied = 0;
    for (const file of files) {
      const dest = bucket.file(`tenants/${tenantId}/${file.name}`);
      const [exists] = await dest.exists();
      if (!exists) { await file.copy(dest); copied++; }
    }
    console.log(`\n✓ Storage: ${copied} image(s) copied to tenants/${tenantId}/inventory/ (originals kept)`);
  } catch (err) {
    console.warn(`\n! Storage copy failed: ${err.message}`);
    console.warn('  Re-run later with credentials, or copy inventory/* → tenants/<id>/inventory/* manually.');
  }
}

console.log(`\nDone. Existing users now belong to tenant "${tenant.name}". They must sign in again.`);
await mongoose.disconnect();

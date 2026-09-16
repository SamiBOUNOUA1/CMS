/**
 * One-time migration: fold the legacy single `assignedManager` field into the new
 * `assignees` array (each entry `{ user, role }`). Safe to re-run — only orders that
 * still have `assignedManager` set and an empty `assignees` array are touched.
 *
 * Usage:
 *   Development:  node scripts/migrate-assignees.mjs
 *   Production:   node scripts/migrate-assignees.mjs --env production --confirm
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const environment = envIndex !== -1 ? args[envIndex + 1] : 'development';
const confirmed = args.includes('--confirm');
const isProd = environment === 'production';

const envFile = isProd ? '.env.production' : '.env';
config({ path: resolve(__dirname, `../${envFile}`) });

if (isProd && !confirmed) {
  console.error('ERROR: Production migration requires the --confirm flag.');
  console.error('  node scripts/migrate-assignees.mjs --env production --confirm');
  process.exit(1);
}

import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(`MONGODB_URI not set in ${envFile}`);
  process.exit(1);
}

console.log(`\nEnvironment : ${environment}`);
console.log(`Config file : ${envFile}\n`);

await mongoose.connect(uri);

// Work directly against the collection so we don't depend on the app's schema.
const orders = mongoose.connection.collection('orders');

const cursor = orders.find({
  assignedManager: { $ne: null, $exists: true },
  $or: [{ assignees: { $exists: false } }, { assignees: { $size: 0 } }],
});

let migrated = 0;
for await (const order of cursor) {
  await orders.updateOne(
    { _id: order._id },
    {
      $set: { assignees: [{ user: order.assignedManager, role: 'manager' }] },
      $unset: { assignedManager: '' },
    }
  );
  migrated++;
}

console.log(`✓ Migrated ${migrated} order(s) from assignedManager → assignees.\n`);

await mongoose.disconnect();

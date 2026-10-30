/**
 * Creates the SaaS operator (platform admin) account used at /platform.
 * This account is separate from every tenant's users and cannot sign in to
 * the tenant app.
 *
 * Usage:
 *   Development:  node scripts/seed-platform-admin.mjs
 *   Production:   node scripts/seed-platform-admin.mjs --env production --confirm
 *
 * Production requires PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD in .env.production.
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
  console.error('ERROR: Production seeding requires the --confirm flag.');
  console.error('  node scripts/seed-platform-admin.mjs --env production --confirm');
  process.exit(1);
}

import mongoose from 'mongoose';
import { hashSync } from 'bcryptjs';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(`MONGODB_URI not set in ${envFile}`);
  process.exit(1);
}

let email = process.env.PLATFORM_ADMIN_EMAIL;
let password = process.env.PLATFORM_ADMIN_PASSWORD;
if (isProd && (!email || !password)) {
  console.error('ERROR: PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD must be set in .env.production');
  process.exit(1);
}
email = (email || 'platform@example.com').toLowerCase();
password = password || 'Platform1234!';

await mongoose.connect(uri);
const admins = mongoose.connection.db.collection('platformadmins');
await admins.createIndex({ email: 1 }, { unique: true });

if (await admins.findOne({ email })) {
  console.log(`\nPlatform admin already exists: ${email}`);
} else {
  const now = new Date();
  await admins.insertOne({ name: 'Platform Admin', email, passwordHash: hashSync(password, 12), isActive: true, createdAt: now, updatedAt: now });
  console.log(`\n✓ Platform admin created — email: ${email}`);
  if (!isProd) console.log(`  Password: ${password}`);
  console.log('  Sign in at /platform/login');
}

await mongoose.disconnect();

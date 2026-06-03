/**
 * Seeds the initial admin user and built-in Role documents.
 *
 * Usage:
 *   Development:  node scripts/seed-admin.mjs
 *   Production:   node scripts/seed-admin.mjs --env production
 *
 * Production requires ADMIN_EMAIL and ADMIN_PASSWORD in .env.production.
 * A --confirm flag is also required for production to prevent accidental runs.
 *   node scripts/seed-admin.mjs --env production --confirm
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Parse CLI args ---
const args = process.argv.slice(2);
const envIndex = args.indexOf('--env');
const environment = envIndex !== -1 ? args[envIndex + 1] : 'development';
const confirmed = args.includes('--confirm');

const isProd = environment === 'production';

// --- Load environment-specific .env file ---
const envFile = isProd ? '.env.production' : '.env';
config({ path: resolve(__dirname, `../${envFile}`) });

if (isProd && !confirmed) {
  console.error('ERROR: Production seeding requires the --confirm flag.');
  console.error('  node scripts/seed-admin.mjs --env production --confirm');
  process.exit(1);
}

import mongoose from 'mongoose';
import { hashSync } from 'bcryptjs';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(`MONGODB_URI not set in ${envFile}`);
  process.exit(1);
}

// --- Resolve admin credentials ---
let adminEmail, adminPassword;

if (isProd) {
  adminEmail = process.env.ADMIN_EMAIL;
  adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.production');
    process.exit(1);
  }
} else {
  adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';
}

console.log(`\nEnvironment : ${environment}`);
console.log(`Config file : ${envFile}`);
console.log(`Admin email : ${adminEmail}\n`);

// --- Schemas ---
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  passwordHash: String,
  role: { type: String, default: 'viewer' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const roleSchema = new mongoose.Schema({
  name:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  label:     { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
  isSystem:  { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

await mongoose.connect(uri);

// --- Seed built-in roles (upsert so re-running is safe) ---
const builtInRoles = [
  { name: 'admin',   label: 'Admin',   isSystem: true,  isDefault: false, sortOrder: 0 },
  { name: 'manager', label: 'Manager', isSystem: false, isDefault: false, sortOrder: 1 },
  { name: 'viewer',  label: 'Viewer',  isSystem: false, isDefault: true,  sortOrder: 2 },
];

for (const r of builtInRoles) {
  const existing = await Role.findOneAndUpdate(
    { name: r.name },
    { $setOnInsert: r },
    { upsert: true, new: false }
  );
  if (!existing) {
    console.log(`✓ Role created: ${r.name}`);
  } else {
    console.log(`  Role already exists: ${r.name}`);
  }
}

// --- Seed admin user ---
const existingUser = await User.findOne({ email: adminEmail });
if (existingUser) {
  console.log(`\nAdmin already exists: ${adminEmail}`);
} else {
  await User.create({
    name: 'Admin',
    email: adminEmail,
    passwordHash: hashSync(adminPassword, 12),
    role: 'admin',
  });
  console.log(`\n✓ Admin created — email: ${adminEmail}`);
  if (!isProd) {
    console.log(`  Password: ${adminPassword}`);
  }
  console.log('  Change the password after first login!');
}

await mongoose.disconnect();

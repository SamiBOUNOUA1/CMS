/**
 * Seeds the initial admin user and built-in Role documents.
 * Usage: node scripts/seed-admin.mjs
 * Set MONGODB_URI in .env.local before running.
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

import mongoose from 'mongoose';
import { hashSync } from 'bcryptjs';

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

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

// Seed built-in roles (upsert so re-running is safe)
const builtInRoles = [
  { name: 'admin',   label: 'Admin',   isSystem: true,  isDefault: false, sortOrder: 0 },
  { name: 'manager', label: 'Manager', isSystem: false, isDefault: false, sortOrder: 1 },
  { name: 'viewer',  label: 'Viewer',  isSystem: false, isDefault: true,  sortOrder: 2 },
];

for (const r of builtInRoles) {
  const result = await Role.findOneAndUpdate(
    { name: r.name },
    { $setOnInsert: r },
    { upsert: true, new: false }
  );
  if (!result) {
    console.log(`✓ Role created: ${r.name}`);
  } else {
    console.log(`  Role already exists: ${r.name}`);
  }
}

// Seed admin user
const email = 'admin@example.com';
const password = 'Admin1234!';

const existing = await User.findOne({ email });
if (existing) {
  console.log(`Admin already exists: ${email}`);
} else {
  await User.create({ name: 'Admin', email, passwordHash: hashSync(password, 12), role: 'admin' });
  console.log(`✓ Admin created — email: ${email}  password: ${password}`);
  console.log('  Change the password after first login!');
}

await mongoose.disconnect();

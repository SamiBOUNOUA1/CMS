import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';

// TOTP (RFC 6238) as used by Google Authenticator: SHA-1, 6 digits, 30s steps.
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // accept ±1 step for clock drift
const ISSUER = 'Catero';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(key: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, '0');
}

/** New random base32 secret (160 bits). */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildOtpauthUrl(accountName: string, secret: string, issuer = ISSUER): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function qrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

/**
 * Verifies a 6-digit code. Returns the matched time step, or null. Steps at or
 * before `lastStep` are rejected so a code can't be replayed.
 */
export function verifyTotp(secret: string, code: string, lastStep = 0): number | null {
  const clean = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const key = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const step = now + i;
    if (step <= lastStep) continue;
    const expected = hotp(key, step);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return step;
  }
  return null;
}

// ── Secret encryption at rest (AES-256-GCM) ──────────────────────────────────

function encKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw) throw new Error('MFA_ENCRYPTION_KEY or JWT_SECRET must be set');
  return createHash('sha256').update(`mfa:${raw}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split('.').map(s => Buffer.from(s, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ── Recovery codes ───────────────────────────────────────────────────────────

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars

function normalizeRecovery(code: string): string {
  return String(code ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hashRecovery(code: string): string {
  return createHash('sha256').update(normalizeRecovery(code)).digest('hex');
}

/** Returns 10 plaintext codes (show once) and their hashes (store). */
export function generateRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8);
    let s = '';
    for (const b of bytes) s += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
    codes.push(`${s.slice(0, 4)}-${s.slice(4)}`);
  }
  return { codes, hashes: codes.map(hashRecovery) };
}

/** Returns the remaining hashes if `input` matched one, otherwise null. */
export function consumeRecoveryCode(hashes: string[], input: string): string[] | null {
  if (!normalizeRecovery(input)) return null;
  const h = hashRecovery(input);
  const idx = (hashes ?? []).indexOf(h);
  if (idx === -1) return null;
  return hashes.filter((_, i) => i !== idx);
}

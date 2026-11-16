// @ts-nocheck
// Per-tenant, gap-free document numbering (Moroccan CGI art. 145-III requires
// invoices to be numbered in a unique, unbroken sequence; the prefix/format is free).
// Must run inside a tenant context.
import { TenantCounter } from '@/lib/models';

/** Counter key: per year (`invoice-2026`) or one continuous series (`invoice-all`). The prefix is NOT part of it. */
export const counterKey = (kind: string, includeYear: boolean, year: number) =>
  includeYear ? `${kind}-${year}` : `${kind}-all`;

/**
 * Atomically takes the next number for `key`.
 * `floor` = how many documents already exist in this counter's scope: the counter
 * is first raised to at least that value, so switching the number format (with or
 * without the year) continues the series instead of restarting or reusing numbers.
 */
export async function nextSequence(key: string, floor = 0): Promise<number> {
  if (floor > 0) {
    // Only ever raises the counter (never lowers it), so it is safe under concurrency.
    await TenantCounter.updateOne({ key, seq: { $lt: floor } }, { $set: { seq: floor } }).catch(() => {});
    if (!(await TenantCounter.exists({ key }))) {
      await TenantCounter.updateOne({ key }, { $setOnInsert: { seq: floor } }, { upsert: true }).catch((err) => {
        if (err?.code !== 11000) throw err; // created concurrently — fine
      });
    }
  }
  const c = await TenantCounter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return c.seq;
}

/**
 * Gives a number back after the document using it failed to save — only when no
 * later number was taken meanwhile, so the sequence never gets a hole or a duplicate.
 * Returns false when it could not be released (the gap must then be documented).
 */
export async function releaseSequence(key: string, seq: number): Promise<boolean> {
  const res = await TenantCounter.updateOne({ key, seq }, { $inc: { seq: -1 } });
  return res.modifiedCount === 1;
}

/** `LSM-00001` (no year) or `FA-2026-00001`. */
export const formatDocNumber = (prefix: string, year: number | null, seq: number) =>
  [prefix, year, String(seq).padStart(5, '0')].filter(p => p !== null && p !== undefined && p !== '').join('-');

/** Prefix rules: 1–10 chars, A-Z 0-9 - / (uppercased). Returns null when invalid. */
export function normalizePrefix(raw: unknown): string | null {
  const p = String(raw ?? '').trim().toUpperCase();
  return /^[A-Z0-9/-]{1,10}$/.test(p) ? p : null;
}

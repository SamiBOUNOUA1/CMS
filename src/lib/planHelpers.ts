import { MODULE_REGISTRY } from '@/lib/modules';

const OPTIONAL_MODULE_IDS = MODULE_REGISTRY.filter(m => !m.builtIn).map(m => m.id);

/** Whitelists the editable Plan fields from a request body. */
export function cleanPlanInput(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (typeof b.name === 'string') out.name = b.name.trim();
  if (b.maxUsers !== undefined) out.maxUsers = Math.max(0, Number(b.maxUsers) || 0);
  if (Array.isArray(b.modules)) out.modules = b.modules.filter(m => OPTIONAL_MODULE_IDS.includes(String(m)));
  if (typeof b.isActive === 'boolean') out.isActive = b.isActive;
  if (b.price !== undefined) out.price = Math.max(0, Number(b.price) || 0);
  if (typeof b.currency === 'string' && /^[a-z]{3}$/i.test(b.currency.trim())) out.currency = b.currency.trim().toUpperCase();
  if (b.billingPeriod === 'monthly' || b.billingPeriod === 'yearly') out.billingPeriod = b.billingPeriod;
  return out;
}

export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export const periodMonths = (billingPeriod?: string) => (billingPeriod === 'yearly' ? 12 : 1);

/** Monthly recurring value of a plan (yearly prices spread over 12 months). */
export const monthlyValue = (plan?: { price?: number; billingPeriod?: string } | null) =>
  plan?.price ? (plan.billingPeriod === 'yearly' ? plan.price / 12 : plan.price) : 0;

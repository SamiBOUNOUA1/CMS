import { MODULE_REGISTRY } from '@/lib/modules';

const OPTIONAL_MODULE_IDS = MODULE_REGISTRY.filter(m => !m.builtIn).map(m => m.id);

/** Whitelists the editable Plan fields from a request body. */
export function cleanPlanInput(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (typeof b.name === 'string') out.name = b.name.trim();
  if (b.maxUsers !== undefined) out.maxUsers = Math.max(0, Number(b.maxUsers) || 0);
  if (Array.isArray(b.modules)) out.modules = b.modules.filter(m => OPTIONAL_MODULE_IDS.includes(String(m)));
  if (typeof b.isActive === 'boolean') out.isActive = b.isActive;
  return out;
}

// @ts-nocheck
import { PlatformSettings } from '@/lib/models';
import { ISSUER_FIELDS, CONTRACT_LANGS, DEFAULT_TEMPLATES, type ContractLang } from '@/lib/contracts';

/** Operator issuer identity + templates, with env vars / built-ins as fallback. */
export async function getPlatformSettings() {
  const doc = await PlatformSettings.findById('default').lean();
  const env = process.env;
  const issuer = { ...(doc?.issuer ?? {}) };
  const fallback = {
    name: env.PLATFORM_INVOICE_NAME || 'Catero',
    address: env.PLATFORM_INVOICE_ADDRESS || '',
    email: env.PLATFORM_INVOICE_EMAIL || '',
    phone: env.PLATFORM_INVOICE_PHONE || '',
    identifiantFiscal: env.PLATFORM_INVOICE_TAX_ID || '',
  };
  for (const [k, v] of Object.entries(fallback)) if (!issuer[k]) issuer[k] = v;
  for (const [k] of ISSUER_FIELDS) issuer[k] ??= '';
  const contractTemplates = {} as Record<ContractLang, string>;
  for (const l of CONTRACT_LANGS) contractTemplates[l] = doc?.contractTemplates?.[l]?.trim() ? doc.contractTemplates[l] : DEFAULT_TEMPLATES[l];
  return {
    issuer,
    contractTemplates,
    customTemplates: Object.fromEntries(CONTRACT_LANGS.map(l => [l, !!doc?.contractTemplates?.[l]?.trim()])),
    defaultContractLanguage: (doc?.defaultContractLanguage ?? 'fr') as ContractLang,
  };
}

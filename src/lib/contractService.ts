// @ts-nocheck
// Server-side contract helpers shared by the provisioning flow and the
// /api/platform/contracts routes.
import { Tenant, TenantContract, PlatformCounter } from '@/lib/models';
import { getPlatformSettings } from '@/lib/platformSettings';
import { buildValues, fillPlaceholders, renderContractText, CONTRACT_LANGS, type ContractLang } from '@/lib/contracts';

export const OPEN_STATUSES = ['draft', 'issued', 'signed'];
export const MAX_SIGNED_PDF = 10 * 1024 * 1024; // 10 MB

export const event = (action: string, by = '', note = '') => ({ at: new Date(), action, by, note });

export const asLang = (l: unknown, fallback: ContractLang = 'fr'): ContractLang =>
  CONTRACT_LANGS.includes(l as ContractLang) ? (l as ContractLang) : fallback;

/** Creates a draft contract for a tenant from the template of the given language. */
export async function createDraftContract(tenantId: string, opts: { language?: string; by?: string } = {}) {
  const tenant = await Tenant.findById(tenantId).select('name').lean();
  if (!tenant) throw Object.assign(new Error('Tenant not found'), { status: 404 });
  const settings = await getPlatformSettings();
  const language = asLang(opts.language, settings.defaultContractLanguage);
  return TenantContract.create({
    tenant: tenant._id,
    tenantName: tenant.name,
    language,
    status: 'draft',
    body: settings.contractTemplates[language],
    events: [event('created', opts.by || 'system')],
  });
}

/** Live placeholder values for a contract (drafts), from current records. */
export async function liveValues(contract) {
  const tenant = await Tenant.findById(contract.tenant).populate('plan').lean();
  const plan = tenant?.plan && typeof tenant.plan === 'object' ? tenant.plan : null;
  const { issuer } = await getPlatformSettings();
  return {
    values: buildValues({ tenant, plan, issuer, contract }, contract.language),
    issuer,
    tenant,
  };
}

/**
 * The data needed to print a contract: frozen snapshot once issued, live
 * values while it is still a draft.
 */
export async function printableContract(contract) {
  if (contract.status !== 'draft' && contract.snapshot?.values) {
    return {
      html: renderContractText(contract.renderedBody),
      values: contract.snapshot.values,
      draft: false,
    };
  }
  const { values } = await liveValues(contract);
  return { html: renderContractText(fillPlaceholders(contract.body, values)), values, draft: true };
}

export async function nextContractNumber(date = new Date()) {
  const year = date.getFullYear();
  const c = await PlatformCounter.findOneAndUpdate(
    { _id: `contract-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return `CTR-${year}-${String(c.seq).padStart(4, '0')}`;
}

export const signedObjectPath = (tenantId: string, contractId: string) =>
  `platform/contracts/${tenantId}/${contractId}-signed-${Date.now()}.pdf`;

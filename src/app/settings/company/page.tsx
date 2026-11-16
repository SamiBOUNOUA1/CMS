'use client';

import { useT } from '@/lib/LanguageContext';
import { useContext, useEffect, useState } from 'react';
import { LanguageContext } from '@/lib/LanguageContext';
import { btnFilled, Field, FormInput, FormSectionLabel, FormGrid, FormSelect, FormTextarea } from '@/app/components/FormPrimitives';

interface CompanyForm {
  companyName: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: { street: string; city: string; postalCode: string; country: string };
  currency: string;
  vatNumber: string;
  // Moroccan legal & tax mentions (invoices)
  legalName: string;
  legalForm: string;
  shareCapital: string;
  ice: string;
  identifiantFiscal: string;
  taxeProfessionnelle: string;
  rcNumber: string;
  rcCourt: string;
  cnss: string;
  bankName: string;
  rib: string;
  vatRegime: 'standard' | 'auto_entrepreneur';
  autoEntrepreneurId: string;
  defaultVatRate: number;
  paymentTermsDays: number;
  latePenaltyText: string;
  applyCashStampDuty: boolean;
  invoiceFooterText: string;
  invoicePrefix: string;
  creditNotePrefix: string;
  numberIncludesYear: boolean;
}

const PREFIX_RE = /^[A-Z0-9/-]{1,10}$/;

const LEGAL_KEYS = [
  'legalName', 'legalForm', 'shareCapital', 'ice', 'identifiantFiscal', 'taxeProfessionnelle',
  'rcNumber', 'rcCourt', 'cnss', 'bankName', 'rib', 'autoEntrepreneurId', 'latePenaltyText', 'invoiceFooterText',
] as const;

const EMPTY: CompanyForm = {
  companyName: '',
  logoUrl: '',
  phone: '',
  email: '',
  address: { street: '', city: '', postalCode: '', country: 'MA' },
  currency: 'MAD',
  vatNumber: '',
  legalName: '', legalForm: '', shareCapital: '', ice: '', identifiantFiscal: '', taxeProfessionnelle: '',
  rcNumber: '', rcCourt: '', cnss: '', bankName: '', rib: '',
  vatRegime: 'standard', autoEntrepreneurId: '', defaultVatRate: 0.2, paymentTermsDays: 60,
  latePenaltyText: '', applyCashStampDuty: false, invoiceFooterText: '',
  invoicePrefix: 'FA', creditNotePrefix: 'AV', numberIncludesYear: true,
};

export default function CompanySettingsPage() {
  const t = useT();
  const ts = t.companySettings;
  const ctx = useContext(LanguageContext);

  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const s = d.settings;
        const legal = Object.fromEntries(LEGAL_KEYS.map(k => [k, s[k] || '']));
        setForm({
          ...EMPTY,
          ...legal,
          companyName: s.companyName || '',
          logoUrl:     s.logoUrl || '',
          phone:       s.phone || '',
          email:       s.email || '',
          address: {
            street:     s.address?.street || '',
            city:       s.address?.city || '',
            postalCode: s.address?.postalCode || '',
            country:    s.address?.country || 'MA',
          },
          currency:  s.currency || 'MAD',
          vatNumber: s.vatNumber || '',
          vatRegime: s.vatRegime === 'auto_entrepreneur' ? 'auto_entrepreneur' : 'standard',
          defaultVatRate: s.defaultVatRate ?? 0.2,
          paymentTermsDays: s.paymentTermsDays ?? 60,
          applyCashStampDuty: !!s.applyCashStampDuty,
          invoicePrefix: s.invoicePrefix || 'FA',
          creditNotePrefix: s.creditNotePrefix || 'AV',
          numberIncludesYear: s.numberIncludesYear !== false,
        });
      })
      .catch(() => showNotif(ts.loadFailed, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof CompanyForm>(key: K, val: CompanyForm[K]) => setForm(f => ({ ...f, [key]: val }));
  const setAddr = (key: keyof CompanyForm['address'], val: string) =>
    setForm(f => ({ ...f, address: { ...f.address, [key]: val } }));

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const iceClean = form.ice.replace(/\s/g, '');
  const iceInvalid = iceClean !== '' && !/^\d{15}$/.test(iceClean);
  const isAE = form.vatRegime === 'auto_entrepreneur';
  const invPrefix = form.invoicePrefix.trim().toUpperCase();
  const cnPrefix = form.creditNotePrefix.trim().toUpperCase();
  const prefixError = !PREFIX_RE.test(invPrefix) || !PREFIX_RE.test(cnPrefix)
    ? ts.prefixInvalid
    : invPrefix === cnPrefix ? ts.prefixSame : '';
  const example = (p: string) => [p, form.numberIncludesYear ? new Date().getFullYear() : null, '00001'].filter(Boolean).join('-');

  const handleSave = async () => {
    if (iceInvalid) { showNotif(ts.iceInvalid, 'error'); return; }
    if (prefixError) { showNotif(prefixError, 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ice: iceClean, invoicePrefix: invPrefix, creditNotePrefix: cnPrefix }),
      });
      if (!res.ok) throw new Error();
      showNotif(ts.saved);
      if (ctx?.setCurrency) ctx.setCurrency(form.currency);
    } catch {
      showNotif(ts.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-g-text-2 p-6">{ts.loading}</p>;
  }

  return (
    <div className="max-w-[640px]">
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-g-text m-0 mb-1">{ts.title}</h2>
        <p className="text-sm text-g-text-2 m-0">{ts.subtitle}</p>
      </div>

      <FormSectionLabel>Identity</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <Field label={ts.companyName}>
          <FormInput value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder={ts.companyNamePlaceholder} />
        </Field>
        <Field label={ts.logoUrl}>
          <FormInput value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder={ts.logoUrlPlaceholder} />
        </Field>
      </div>

      <FormSectionLabel>Contact</FormSectionLabel>
      <FormGrid className="mb-6">
        <Field label={ts.phone}>
          <FormInput value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={ts.phonePlaceholder} />
        </Field>
        <Field label={ts.email}>
          <FormInput type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={ts.emailPlaceholder} />
        </Field>
      </FormGrid>

      <FormSectionLabel>{ts.address}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <Field label={ts.street}>
          <FormInput value={form.address.street} onChange={e => setAddr('street', e.target.value)} placeholder={ts.streetPlaceholder} />
        </Field>
        <FormGrid>
          <Field label={ts.city}>
            <FormInput value={form.address.city} onChange={e => setAddr('city', e.target.value)} placeholder={ts.cityPlaceholder} />
          </Field>
          <Field label={ts.postalCode}>
            <FormInput value={form.address.postalCode} onChange={e => setAddr('postalCode', e.target.value)} placeholder={ts.postalCodePlaceholder} />
          </Field>
        </FormGrid>
        <Field label={ts.country} className="max-w-[160px]">
          <FormInput value={form.address.country} onChange={e => setAddr('country', e.target.value)} placeholder={ts.countryPlaceholder} />
        </Field>
      </div>

      <FormSectionLabel>Financial</FormSectionLabel>
      <FormGrid className="mb-8">
        <div>
          <Field label={ts.currency}>
            <FormInput value={form.currency} onChange={e => set('currency', e.target.value)} placeholder={ts.currencyPlaceholder} maxLength={4} className="max-w-[100px]" />
          </Field>
          <p className="text-[11px] text-g-text-3 mt-1">{ts.currencyHint}</p>
        </div>
        <Field label={ts.vatNumber}>
          <FormInput value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder={ts.vatNumberPlaceholder} />
        </Field>
      </FormGrid>

      <FormSectionLabel>{ts.legalSection}</FormSectionLabel>
      <p className="text-[12px] text-g-text-2 -mt-2 mb-4">{ts.legalSectionHint}</p>
      <div className="flex flex-col gap-4 mb-8">
        <FormGrid>
          <Field label={ts.legalName}>
            <FormInput value={form.legalName} onChange={e => set('legalName', e.target.value)} placeholder={form.companyName} />
          </Field>
          <Field label={ts.legalForm}>
            <FormInput value={form.legalForm} onChange={e => set('legalForm', e.target.value)} placeholder={ts.legalFormPlaceholder} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label={`${ts.ice} (${ts.iceHint})`} error={iceInvalid ? ts.iceInvalid : undefined}>
            <FormInput value={form.ice} onChange={e => set('ice', e.target.value)} inputMode="numeric" maxLength={20} error={iceInvalid ? ts.iceInvalid : undefined} />
          </Field>
          <Field label={ts.identifiantFiscal}>
            <FormInput value={form.identifiantFiscal} onChange={e => set('identifiantFiscal', e.target.value)} />
          </Field>
        </FormGrid>
        {!isAE && (
          <>
            <FormGrid>
              <Field label={ts.rcNumber}>
                <FormInput value={form.rcNumber} onChange={e => set('rcNumber', e.target.value)} />
              </Field>
              <Field label={ts.rcCourt}>
                <FormInput value={form.rcCourt} onChange={e => set('rcCourt', e.target.value)} />
              </Field>
            </FormGrid>
            <FormGrid>
              <Field label={ts.taxeProfessionnelle}>
                <FormInput value={form.taxeProfessionnelle} onChange={e => set('taxeProfessionnelle', e.target.value)} />
              </Field>
              <Field label={ts.shareCapital}>
                <FormInput value={form.shareCapital} onChange={e => set('shareCapital', e.target.value)} placeholder={ts.shareCapitalPlaceholder} />
              </Field>
            </FormGrid>
          </>
        )}
        <FormGrid>
          <Field label={ts.cnss}>
            <FormInput value={form.cnss} onChange={e => set('cnss', e.target.value)} />
          </Field>
          <Field label={ts.bankName}>
            <FormInput value={form.bankName} onChange={e => set('bankName', e.target.value)} />
          </Field>
        </FormGrid>
        <Field label={ts.rib}>
          <FormInput value={form.rib} onChange={e => set('rib', e.target.value)} />
        </Field>
      </div>

      <FormSectionLabel>{ts.invoicingSection}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-8">
        <FormGrid>
          <Field label={ts.vatRegime}>
            <FormSelect value={form.vatRegime} onChange={e => set('vatRegime', e.target.value as CompanyForm['vatRegime'])}>
              <option value="standard">{ts.vatRegimeStandard}</option>
              <option value="auto_entrepreneur">{ts.vatRegimeAE}</option>
            </FormSelect>
          </Field>
          {isAE ? (
            <Field label={ts.autoEntrepreneurId}>
              <FormInput value={form.autoEntrepreneurId} onChange={e => set('autoEntrepreneurId', e.target.value)} />
            </Field>
          ) : (
            <Field label={ts.defaultVatRate}>
              <FormSelect value={String(form.defaultVatRate)} onChange={e => set('defaultVatRate', Number(e.target.value))}>
                <option value="0.2">20 %</option>
                <option value="0.1">10 %</option>
                <option value="0">0 %</option>
              </FormSelect>
            </Field>
          )}
        </FormGrid>
        <div>
          <Field label={ts.paymentTermsDays} className="max-w-[200px]">
            <FormInput type="number" min={0} max={120} value={form.paymentTermsDays}
              onChange={e => set('paymentTermsDays', Math.min(120, Math.max(0, Number(e.target.value) || 0)))} />
          </Field>
          <p className="text-[11px] text-g-text-3 mt-1">{ts.paymentTermsHint}</p>
        </div>
        <Field label={ts.latePenaltyText}>
          <FormTextarea rows={2} value={form.latePenaltyText} onChange={e => set('latePenaltyText', e.target.value)} placeholder={ts.latePenaltyPlaceholder} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-g-text cursor-pointer">
          <input type="checkbox" checked={form.applyCashStampDuty} onChange={e => set('applyCashStampDuty', e.target.checked)} />
          {ts.applyCashStampDuty}
        </label>
        <FormGrid>
          <Field label={ts.invoicePrefix} error={prefixError || undefined}>
            <FormInput value={form.invoicePrefix} maxLength={10} onChange={e => set('invoicePrefix', e.target.value.toUpperCase())} />
          </Field>
          <Field label={ts.creditNotePrefix}>
            <FormInput value={form.creditNotePrefix} maxLength={10} onChange={e => set('creditNotePrefix', e.target.value.toUpperCase())} />
          </Field>
        </FormGrid>
        <label className="flex items-center gap-2 text-sm text-g-text cursor-pointer">
          <input type="checkbox" checked={form.numberIncludesYear} onChange={e => set('numberIncludesYear', e.target.checked)} />
          {ts.numberIncludesYear}
        </label>
        <p className="text-[12px] text-g-text-2 -mt-2 m-0">
          {ts.numberExample(example(invPrefix || 'FA'), example(cnPrefix || 'AV'))}
          <br />
          <span className="text-g-text-3">{ts.numberHint}</span>
        </p>
        <Field label={ts.invoiceFooterText}>
          <FormTextarea rows={2} value={form.invoiceFooterText} onChange={e => set('invoiceFooterText', e.target.value)} />
        </Field>
      </div>

      <button onClick={handleSave} disabled={saving} className={btnFilled}>
        {saving ? ts.saving : ts.save}
      </button>

      {notif && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-5 rounded-lg text-sm shadow-google-2 z-[9999]"
          style={{ background: notif.type === 'error' ? '#d93025' : '#202124' }}>
          {notif.msg}
        </div>
      )}
    </div>
  );
}

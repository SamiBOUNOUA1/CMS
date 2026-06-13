'use client';

import { useT } from '@/lib/LanguageContext';
import { useContext, useEffect, useState } from 'react';
import { LanguageContext } from '@/lib/LanguageContext';
import { btnFilled, Field, FormInput, FormSectionLabel, FormGrid } from '@/app/components/FormPrimitives';

interface CompanyForm {
  companyName: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: { street: string; city: string; postalCode: string; country: string };
  currency: string;
  vatNumber: string;
}

const EMPTY: CompanyForm = {
  companyName: '',
  logoUrl: '',
  phone: '',
  email: '',
  address: { street: '', city: '', postalCode: '', country: 'FR' },
  currency: '€',
  vatNumber: '',
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
        setForm({
          companyName: s.companyName || '',
          logoUrl:     s.logoUrl || '',
          phone:       s.phone || '',
          email:       s.email || '',
          address: {
            street:     s.address?.street || '',
            city:       s.address?.city || '',
            postalCode: s.address?.postalCode || '',
            country:    s.address?.country || 'FR',
          },
          currency:  s.currency || '€',
          vatNumber: s.vatNumber || '',
        });
      })
      .catch(() => showNotif(ts.loadFailed, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof CompanyForm, val: string) => setForm(f => ({ ...f, [key]: val }));
  const setAddr = (key: keyof CompanyForm['address'], val: string) =>
    setForm(f => ({ ...f, address: { ...f.address, [key]: val } }));

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

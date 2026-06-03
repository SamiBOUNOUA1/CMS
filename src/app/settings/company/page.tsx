'use client';

import { useT } from '@/lib/LanguageContext';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/LanguageContext';
import { useEffect, useState } from 'react';

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
    return <p className="text-[#5f6368] p-6" style={{ fontFamily: "'Google Sans'" }}>{ts.loading}</p>;
  }

  return (
    <div className="max-w-[640px]">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-[#202124] m-0 mb-1" style={{ fontFamily: "'Google Sans'" }}>
          {ts.title}
        </h2>
        <p className="text-sm text-[#5f6368] m-0" style={{ fontFamily: "'Google Sans'" }}>
          {ts.subtitle}
        </p>
      </div>

      {/* Identity */}
      <p className={sectionTitleCls}>Identity</p>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>{ts.companyName}</label>
          <input className={inputCls} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder={ts.companyNamePlaceholder} />
        </div>
        <div>
          <label className={labelCls}>{ts.logoUrl}</label>
          <input className={inputCls} value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder={ts.logoUrlPlaceholder} />
        </div>
      </div>

      {/* Contact */}
      <p className={sectionTitleCls}>Contact</p>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{ts.phone}</label>
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={ts.phonePlaceholder} />
          </div>
          <div>
            <label className={labelCls}>{ts.email}</label>
            <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={ts.emailPlaceholder} />
          </div>
        </div>
      </div>

      {/* Address */}
      <p className={sectionTitleCls}>{ts.address}</p>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>{ts.street}</label>
          <input className={inputCls} value={form.address.street} onChange={e => setAddr('street', e.target.value)} placeholder={ts.streetPlaceholder} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{ts.city}</label>
            <input className={inputCls} value={form.address.city} onChange={e => setAddr('city', e.target.value)} placeholder={ts.cityPlaceholder} />
          </div>
          <div>
            <label className={labelCls}>{ts.postalCode}</label>
            <input className={inputCls} value={form.address.postalCode} onChange={e => setAddr('postalCode', e.target.value)} placeholder={ts.postalCodePlaceholder} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{ts.country}</label>
          <input className={inputCls} style={{ maxWidth: 120 }} value={form.address.country} onChange={e => setAddr('country', e.target.value)} placeholder={ts.countryPlaceholder} />
        </div>
      </div>

      {/* Financial */}
      <p className={sectionTitleCls}>Financial</p>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{ts.currency}</label>
            <input className={inputCls} style={{ maxWidth: 80 }} value={form.currency} onChange={e => set('currency', e.target.value)} placeholder={ts.currencyPlaceholder} maxLength={4} />
            <p className="text-[11px] text-[#9aa0a6] mt-1" style={{ fontFamily: "'Google Sans'" }}>{ts.currencyHint}</p>
          </div>
          <div>
            <label className={labelCls}>{ts.vatNumber}</label>
            <input className={inputCls} value={form.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder={ts.vatNumberPlaceholder} />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="py-2.5 px-6 rounded-lg border-none text-white text-sm font-medium"
          style={{
            fontFamily: "'Google Sans'",
            cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? '#9aa0a6' : '#1a73e8',
          }}
        >
          {saving ? ts.saving : ts.save}
        </button>
      </div>

      {/* Toast notification */}
      {notif && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-5 rounded-lg text-sm"
          style={{
            background: notif.type === 'error' ? '#d93025' : '#202124',
            fontFamily: "'Google Sans'",
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,.2)',
          }}>
          {notif.msg}
        </div>
      )}
    </div>
  );
}

const labelCls = 'block text-[13px] font-medium text-[#5f6368] mb-1';
const inputCls = 'w-full py-[9px] px-3 rounded-lg border border-[#dadce0] text-sm text-[#202124] outline-none bg-white box-border';
const sectionTitleCls = 'text-[13px] font-semibold tracking-[0.04em] uppercase text-[#9aa0a6] mb-3 mt-7';

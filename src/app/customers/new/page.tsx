'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, Field, FormInput, FormSelect, FormTextarea } from '@/app/components/FormPrimitives';

export default function NewCustomerPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.customerDetail;

  const [customerTypes, setCustomerTypes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', customerType: '', leadSource: '', notes: '',
    billingAddress: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
  });

  useEffect(() => {
    fetch('/api/settings/customer-types')
      .then(r => r.ok ? r.json() : { configs: [] })
      .then((d: any) => setCustomerTypes(d.configs || []));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string) => setForm(f => ({ ...f, billingAddress: { ...f.billingAddress, [k]: v } }));

  const showNotification = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { showNotification('Name is required', 'error'); return; }
    if (!form.email.trim()) { showNotification('Email is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      router.push(`/customers/${data.client._id}`);
    } catch (err: any) {
      showNotification(err.message || tp.saveFailed, 'error');
      setSaving(false);
    }
  };

  const cardCls = `bg-white border border-[#e8eaed] rounded-xl mb-4 ${isMobile ? 'p-[18px]' : 'p-6'}`;
  const sectionLabelCls = 'text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider block mb-3.5';

  return (
    <div className="mx-auto" style={{ maxWidth: 700, padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}
        >
          {notification.msg}
        </div>
      )}

      <Link href="/customers" className="inline-flex items-center gap-1.5 text-[#5f6368] no-underline text-sm mb-5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      <h1 className="mb-6 font-medium text-[#202124]" style={{ fontSize: isMobile ? 20 : 24 }}>
        {t.customersPage.newCustomer}
      </h1>

      {/* Contact */}
      <div className={cardCls}>
        <span className={sectionLabelCls}>{tp.infoSection}</span>
        <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
          <Field label={tp.fields.name}>
            <FormInput value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)} />
          </Field>
          <Field label={tp.fields.email}>
            <FormInput type="email" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('email', e.target.value)} />
          </Field>
          <Field label={tp.fields.phone}>
            <FormInput value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('phone', e.target.value)} />
          </Field>
          <Field label={tp.fields.customerType}>
            <FormSelect value={form.customerType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('customerType', e.target.value)}>
              <option value="">{tp.fields.noType}</option>
              {customerTypes.filter((ct: any) => ct.isActive).map((ct: any) => (
                <option key={ct.key} value={ct.key}>{ct.label}</option>
              ))}
            </FormSelect>
          </Field>
          <Field label={tp.fields.leadSource}>
            <FormSelect value={form.leadSource} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('leadSource', e.target.value)}>
              <option value="">{tp.fields.noLeadSource}</option>
              {Object.entries(tp.fields.leadSources).map(([key, label]) => (
                <option key={key} value={key}>{label as string}</option>
              ))}
            </FormSelect>
          </Field>
        </div>
      </div>

      {/* Billing Address */}
      <div className={cardCls}>
        <span className={sectionLabelCls}>{tp.billingSection}</span>
        <div className="flex flex-col gap-4">
          <Field label={tp.fields.street}>
            <FormInput value={form.billingAddress.street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('street', e.target.value)} />
          </Field>
          <div className="grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
            <Field label={tp.fields.city}>
              <FormInput value={form.billingAddress.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('city', e.target.value)} />
            </Field>
            <Field label={tp.fields.postalCode}>
              <FormInput value={form.billingAddress.postalCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('postalCode', e.target.value)} />
            </Field>
            <Field label={tp.fields.state}>
              <FormInput value={form.billingAddress.state} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('state', e.target.value)} />
            </Field>
            <Field label={tp.fields.country}>
              <FormInput value={form.billingAddress.country} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('country', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className={cardCls}>
        <span className={sectionLabelCls}>{tp.notesSection}</span>
        <Field label={tp.fields.notes}>
          <FormTextarea rows={4} value={form.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('notes', e.target.value)} />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2.5">
        <Link href="/customers" className={btnOutline}>{tp.cancelEdit}</Link>
        <button onClick={handleSubmit} disabled={saving} className={btnFilled} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? '…' : tp.saveCustomer}
        </button>
      </div>
    </div>
  );
}

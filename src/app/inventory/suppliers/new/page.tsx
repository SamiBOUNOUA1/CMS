'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, Field, FormInput, FormSelect, FormTextarea, FormCard, FormSectionLabel, FormGrid, formPageCls } from '@/app/components/FormPrimitives';

const TYPE_KEYS = ['goods', 'materials', 'services'] as const;

export default function NewSupplierPage() {
  const router = useRouter();
  const t = useT();
  const tp = t.supplierDetail;

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', supplierType: '', contactPerson: '', notes: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string) => setForm(f => ({ ...f, address: { ...f.address, [k]: v } }));

  const showNotification = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { showNotification(tp.fields.name + ' is required', 'error'); return; }
    if (!form.supplierType) { showNotification(tp.fields.supplierType + ' is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      router.push(`/inventory/suppliers/${data.supplier._id}`);
    } catch (err: any) {
      showNotification(err.message || tp.saveFailed, 'error');
      setSaving(false);
    }
  };

  return (
    <div className={formPageCls}>
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}
        >
          {notification.msg}
        </div>
      )}

      <Link href="/inventory/suppliers" className="inline-flex items-center gap-1.5 text-sm text-g-text-2 no-underline mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      <h1 className="mb-6 text-2xl font-medium text-g-text m-0">
        {tp.newSupplier}
      </h1>

      <FormCard>
        <FormSectionLabel>{tp.infoSection}</FormSectionLabel>
        <FormGrid>
          <Field label={`${tp.fields.name} *`}>
            <FormInput value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)} />
          </Field>
          <Field label={`${tp.fields.supplierType} *`}>
            <FormSelect value={form.supplierType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('supplierType', e.target.value)}>
              <option value="">{tp.fields.noType}</option>
              {TYPE_KEYS.map(key => (
                <option key={key} value={key}>{tp.fields.supplierTypes[key]}</option>
              ))}
            </FormSelect>
          </Field>
          <Field label={tp.fields.email}>
            <FormInput type="email" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('email', e.target.value)} />
          </Field>
          <Field label={tp.fields.phone}>
            <FormInput value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('phone', e.target.value)} />
          </Field>
          <Field label={tp.fields.contactPerson}>
            <FormInput value={form.contactPerson} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('contactPerson', e.target.value)} />
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard>
        <FormSectionLabel>{tp.addressSection}</FormSectionLabel>
        <div className="flex flex-col gap-4">
          <Field label={tp.fields.street}>
            <FormInput value={form.address.street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('street', e.target.value)} />
          </Field>
          <FormGrid>
            <Field label={tp.fields.city}>
              <FormInput value={form.address.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('city', e.target.value)} />
            </Field>
            <Field label={tp.fields.postalCode}>
              <FormInput value={form.address.postalCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('postalCode', e.target.value)} />
            </Field>
            <Field label={tp.fields.state}>
              <FormInput value={form.address.state} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('state', e.target.value)} />
            </Field>
            <Field label={tp.fields.country}>
              <FormInput value={form.address.country} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('country', e.target.value)} />
            </Field>
          </FormGrid>
        </div>
      </FormCard>

      <FormCard>
        <FormSectionLabel>{tp.notesSection}</FormSectionLabel>
        <Field label={tp.fields.notes}>
          <FormTextarea rows={4} value={form.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('notes', e.target.value)} />
        </Field>
      </FormCard>

      <div className="flex justify-end gap-2.5">
        <Link href="/inventory/suppliers" className={btnOutline}>{tp.cancelEdit}</Link>
        <button onClick={handleSubmit} disabled={saving} className={btnFilled}>
          {saving ? '…' : tp.saveSupplier}
        </button>
      </div>
    </div>
  );
}

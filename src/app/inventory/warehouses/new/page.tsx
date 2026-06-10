'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';
import { Field, FormInput, FormTextarea } from '@/app/components/FormPrimitives';
import dynamic from 'next/dynamic';

const WarehouseMap = dynamic(() => import('@/app/components/WarehouseMap'), { ssr: false });

export default function NewWarehousePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.warehouseDetail;

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', notes: '',
    address: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
    coordinates: { lat: null as number | null, lng: null as number | null },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k: string, v: string) => setForm(f => ({ ...f, address: { ...f.address, [k]: v } }));
  const setCoords = (lat: number, lng: number) => setForm(f => ({ ...f, coordinates: { lat, lng } }));

  const showNotification = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { showNotification(tp.fields.name + ' is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      router.push(`/inventory/warehouses/${data.warehouse._id}`);
    } catch (err: any) {
      showNotification(err.message || tp.saveFailed, 'error');
      setSaving(false);
    }
  };

  const addressString = [form.address.street, form.address.city, form.address.postalCode, form.address.country]
    .filter(Boolean).join(', ');

  const cardCls = `bg-g-surface border border-g-border rounded-2xl mb-4 shadow-google-1 ${isMobile ? 'p-[18px]' : 'p-6'}`;
  const sectionLabelCls = 'text-[11px] font-semibold text-g-text-2 uppercase tracking-wider block mb-4';

  return (
    <div className="mx-auto" style={{ maxWidth: 700, padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {/* Toast */}
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}
        >
          {notification.msg}
        </div>
      )}

      {/* Back */}
      <Link href="/inventory/warehouses" className="inline-flex items-center gap-1.5 text-sm text-g-text-2 no-underline mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      <h1 className="mb-6 font-medium text-g-text m-0" style={{ fontSize: isMobile ? 20 : 24 }}>
        {tp.newWarehouse}
      </h1>

      {/* Info */}
      <div className={cardCls}>
        <span className={sectionLabelCls}>{tp.infoSection}</span>
        <div className="flex flex-col gap-4">
          <Field label={`${tp.fields.name} *`}>
            <FormInput value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)} />
          </Field>
          <Field label={tp.fields.description}>
            <FormInput value={form.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('description', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Address & Location */}
      <div className={cardCls}>
        <span className={sectionLabelCls}>{tp.addressSection}</span>
        <div className="flex flex-col gap-4">
          <Field label={tp.fields.street}>
            <FormInput value={form.address.street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr('street', e.target.value)} />
          </Field>
          <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
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
          </div>
          <div className="mt-2">
            <WarehouseMap
              lat={form.coordinates.lat}
              lng={form.coordinates.lng}
              onLocationChange={setCoords}
              address={addressString}
            />
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
        <Link
          href="/inventory/warehouses"
          className="ripple bg-transparent text-g-text-2 border border-g-border rounded-full py-2.5 px-5 text-sm font-medium no-underline inline-flex items-center transition-google"
        >
          {tp.cancelEdit}
        </Link>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="ripple bg-google-blue text-white border-none rounded-full py-2.5 px-6 text-sm font-medium cursor-pointer shadow-google-1 transition-google disabled:opacity-70"
        >
          {saving ? '…' : tp.saveWarehouse}
        </button>
      </div>
    </div>
  );
}

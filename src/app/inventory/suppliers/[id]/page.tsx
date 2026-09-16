// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, Field, FormInput, FormSelect, FormTextarea, FormCard, FormSectionLabel, FormGrid } from '@/app/components/FormPrimitives';

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

const TYPE_KEYS = ['goods', 'materials', 'services'];

const EMPTY_FORM = {
  name: '', email: '', phone: '', supplierType: '', contactPerson: '', notes: '',
  address: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
};

const typeBadgeStyle = (type) => {
  const bg = { goods: '#e6f4ea', materials: '#fce8b2', services: '#e8f0fe' };
  const color = { goods: '#137333', materials: '#b06000', services: '#1a73e8' };
  return { background: bg[type] || '#f1f3f4', color: color[type] || '#5f6368' };
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const tp = t.supplierDetail;

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState({});
  const [notification, setNotification] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const id = params.id;
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch(`/api/inventory/suppliers/${id}`).then(r => r.ok ? r.json() : null),
    ]).then(([me, supplierData]) => {
      if (me?.user?.permissions) setPerms(me.user.permissions);
      if (supplierData?.supplier) {
        setSupplier(supplierData.supplier);
        seedEditForm(supplierData.supplier);
      }
      setLoading(false);
    });
  }, [params.id]);

  function seedEditForm(s) {
    setEditForm({
      name: s.name || '', email: s.email || '', phone: s.phone || '',
      supplierType: s.supplierType || '', contactPerson: s.contactPerson || '', notes: s.notes || '',
      address: {
        street: s.address?.street || '', city: s.address?.city || '',
        state: s.address?.state || '', postalCode: s.address?.postalCode || '',
        country: s.address?.country || 'FR',
      },
    });
  }

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setEditForm(f => ({ ...f, address: { ...f.address, [k]: v } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/suppliers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSupplier(data.supplier);
      seedEditForm(data.supplier);
      setEditing(false);
      showNotification(tp.saved);
    } catch {
      showNotification(tp.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/suppliers/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/inventory/suppliers');
    } catch {
      showNotification(tp.deleteFailed, 'error');
      setDeleteOpen(false);
    }
  };

  const fieldLabelCls = 'text-[12px] text-g-text-3 mb-0.5';
  const fieldValueCls = 'text-sm text-g-text';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-g-border border-t-google-green animate-spin" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="max-w-[800px] mx-auto p-10 text-center">
        <p className="text-g-text-2 mb-3">{tp.loadFailed}</p>
        <Link href="/inventory/suppliers" className="text-google-blue no-underline text-sm">← {tp.back}</Link>
      </div>
    );
  }

  const typeLabel = tp.fields.supplierTypes[supplier.supplierType] || supplier.supplierType;

  return (
    <div className="max-w-[800px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      {/* Toast */}
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}
        >
          {notification.msg}
        </div>
      )}

      {/* Delete dialog */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/45 z-[199] flex items-center justify-center p-4">
          <div className="bg-g-surface rounded-2xl p-7 max-w-[400px] w-full shadow-google-3">
            <h3 className="m-0 mb-2 text-lg font-medium text-g-text">{tp.deleteDialog.title}</h3>
            <p className="m-0 mt-2 mb-6 text-sm text-g-text-2 leading-relaxed">{tp.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="ripple bg-transparent text-g-text-2 border border-g-border rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer transition-google"
              >
                {tp.deleteDialog.cancel}
              </button>
              <button
                onClick={handleDelete}
                className="ripple bg-google-red text-white border-none rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer transition-google"
              >
                {tp.deleteDialog.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <Link href="/inventory/suppliers" className="inline-flex items-center gap-1.5 text-sm text-g-text-2 no-underline mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      {/* Header card */}
      <FormCard className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className="rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium"
            style={{ width: 52, height: 52, background: avatarColor(supplier.name), fontSize: 22 }}
          >
            {(supplier.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-medium text-g-text">
              {supplier.name}
            </h1>
            {(supplier.email || supplier.phone) && (
              <p className="m-0 mt-1 text-sm text-g-text-2">
                {supplier.email}
                {supplier.email && supplier.phone ? ' · ' : ''}
                {supplier.phone}
              </p>
            )}
            {supplier.supplierType && (
              <span
                className="inline-block mt-2 py-0.5 px-2.5 rounded-full text-[12px] font-medium"
                style={typeBadgeStyle(supplier.supplierType)}
              >
                {typeLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {perms.edit_suppliers && !editing && (
            <button onClick={() => setEditing(true)} className={btnOutline}>
              {tp.editSupplier}
            </button>
          )}
          {perms.delete_suppliers && !editing && (
            <button onClick={() => setDeleteOpen(true)} className={btnFilled.replace('bg-google-blue', 'bg-google-red')}>
              {tp.deleteSupplier}
            </button>
          )}
        </div>
      </FormCard>

      {/* Contact section */}
      <FormCard>
        <FormSectionLabel>{tp.infoSection}</FormSectionLabel>
        {!editing ? (
          <FormGrid>
            {[
              { label: tp.fields.name, value: supplier.name },
              { label: tp.fields.supplierType, value: typeLabel },
              { label: tp.fields.email, value: supplier.email || '—' },
              { label: tp.fields.phone, value: supplier.phone || '—' },
              { label: tp.fields.contactPerson, value: supplier.contactPerson || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className={`m-0 ${fieldLabelCls}`}>{label}</p>
                <p className={`m-0 mt-0.5 ${fieldValueCls}`}>{value}</p>
              </div>
            ))}
          </FormGrid>
        ) : (
          <FormGrid>
            <Field label={`${tp.fields.name} *`}>
              <FormInput value={editForm.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label={`${tp.fields.supplierType} *`}>
              <FormSelect value={editForm.supplierType} onChange={e => set('supplierType', e.target.value)}>
                <option value="">{tp.fields.noType}</option>
                {TYPE_KEYS.map(key => (
                  <option key={key} value={key}>{tp.fields.supplierTypes[key]}</option>
                ))}
              </FormSelect>
            </Field>
            <Field label={tp.fields.email}>
              <FormInput type="email" value={editForm.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label={tp.fields.phone}>
              <FormInput value={editForm.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label={tp.fields.contactPerson}>
              <FormInput value={editForm.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
            </Field>
          </FormGrid>
        )}
      </FormCard>

      {/* Address section */}
      <FormCard>
        <FormSectionLabel>{tp.addressSection}</FormSectionLabel>
        {!editing ? (
          (() => {
            const addr = supplier.address || {};
            const hasAddr = addr.street || addr.city || addr.postalCode || addr.state || addr.country;
            if (!hasAddr) return <p className="m-0 text-sm text-g-text-3">{tp.noAddress}</p>;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {addr.street && (
                  <div className="sm:col-span-2">
                    <p className={`m-0 ${fieldLabelCls}`}>{tp.fields.street}</p>
                    <p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.street}</p>
                  </div>
                )}
                {addr.city && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.city}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.city}</p></div>}
                {addr.postalCode && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.postalCode}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.postalCode}</p></div>}
                {addr.state && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.state}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.state}</p></div>}
                {addr.country && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.country}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.country}</p></div>}
              </div>
            );
          })()
        ) : (
          <div className="flex flex-col gap-4">
            <Field label={tp.fields.street}>
              <FormInput value={editForm.address.street} onChange={e => setAddr('street', e.target.value)} />
            </Field>
            <FormGrid>
              <Field label={tp.fields.city}>
                <FormInput value={editForm.address.city} onChange={e => setAddr('city', e.target.value)} />
              </Field>
              <Field label={tp.fields.postalCode}>
                <FormInput value={editForm.address.postalCode} onChange={e => setAddr('postalCode', e.target.value)} />
              </Field>
              <Field label={tp.fields.state}>
                <FormInput value={editForm.address.state} onChange={e => setAddr('state', e.target.value)} />
              </Field>
              <Field label={tp.fields.country}>
                <FormInput value={editForm.address.country} onChange={e => setAddr('country', e.target.value)} />
              </Field>
            </FormGrid>
          </div>
        )}
      </FormCard>

      {/* Notes section */}
      <FormCard>
        <FormSectionLabel>{tp.notesSection}</FormSectionLabel>
        {!editing ? (
          <p className={`m-0 text-sm leading-relaxed whitespace-pre-wrap ${supplier.notes ? 'text-g-text' : 'text-g-text-3'}`}>
            {supplier.notes || tp.noNotes}
          </p>
        ) : (
          <Field label={tp.fields.notes}>
            <FormTextarea rows={4} value={editForm.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        )}
      </FormCard>

      {/* Save / Cancel */}
      {editing && (
        <div className="flex justify-end gap-2">
          <button onClick={() => { setEditing(false); seedEditForm(supplier); }} disabled={saving} className={btnOutline}>
            {tp.cancelEdit}
          </button>
          <button onClick={handleSave} disabled={saving} className={btnFilled}>
            {saving ? '…' : tp.saveSupplier}
          </button>
        </div>
      )}
    </div>
  );
}

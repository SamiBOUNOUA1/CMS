// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, Field, FormInput, FormTextarea, FormCard, FormSectionLabel, FormGrid } from '@/app/components/FormPrimitives';
import dynamic from 'next/dynamic';

const WarehouseMap = dynamic(() => import('@/app/components/WarehouseMap'), { ssr: false });

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

const EMPTY_FORM = {
  name: '', description: '', notes: '',
  address: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
  coordinates: { lat: null, lng: null },
};

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const tp = t.warehouseDetail;

  const [warehouse, setWarehouse] = useState(null);
  const [itemCount, setItemCount] = useState(0);
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
      fetch(`/api/inventory/warehouses/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/inventory/items?warehouse=${id}`).then(r => r.ok ? r.json() : null),
    ]).then(([me, wData, itemsData]) => {
      if (me?.user?.permissions) setPerms(me.user.permissions);
      if (wData?.warehouse) {
        setWarehouse(wData.warehouse);
        seedEditForm(wData.warehouse);
      }
      if (itemsData?.items) setItemCount(itemsData.items.length);
      setLoading(false);
    });
  }, [params.id]);

  function seedEditForm(w) {
    setEditForm({
      name: w.name || '',
      description: w.description || '',
      notes: w.notes || '',
      address: {
        street: w.address?.street || '',
        city: w.address?.city || '',
        state: w.address?.state || '',
        postalCode: w.address?.postalCode || '',
        country: w.address?.country || 'FR',
      },
      coordinates: {
        lat: w.coordinates?.lat ?? null,
        lng: w.coordinates?.lng ?? null,
      },
    });
  }

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setEditForm(f => ({ ...f, address: { ...f.address, [k]: v } }));
  const setCoords = (lat, lng) => setEditForm(f => ({ ...f, coordinates: { lat, lng } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/warehouses/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWarehouse(data.warehouse);
      seedEditForm(data.warehouse);
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
      const res = await fetch(`/api/inventory/warehouses/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/inventory/warehouses');
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

  if (!warehouse) {
    return (
      <div className="max-w-[800px] mx-auto p-10 text-center">
        <p className="text-g-text-2 mb-3">{tp.loadFailed}</p>
        <Link href="/inventory/warehouses" className="text-google-blue no-underline text-sm">← {tp.back}</Link>
      </div>
    );
  }

  const hasCoords = warehouse.coordinates?.lat != null && warehouse.coordinates?.lng != null;
  const editAddressString = [editForm.address.street, editForm.address.city, editForm.address.postalCode, editForm.address.country]
    .filter(Boolean).join(', ');

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
              <button onClick={() => setDeleteOpen(false)} className={btnOutline}>{tp.deleteDialog.cancel}</button>
              <button onClick={handleDelete} className={btnFilled} style={{ background: '#d93025' }}>{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <Link href="/inventory/warehouses" className="inline-flex items-center gap-1.5 text-sm text-g-text-2 no-underline mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      {/* Header card */}
      <FormCard className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className="rounded-full flex-shrink-0 flex items-center justify-center text-white"
            style={{ width: 52, height: 52, background: avatarColor(warehouse.name) }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8.5V8H4v.5L2 9v12h20V9l-2-.5zm-9 10.5H5v-7h6v7zm8 0h-6v-7h6v7zM22 7H2V5h20v2zM11 3H2v2h9V3zm11 0h-9v2h9V3z" />
            </svg>
          </div>
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-medium text-g-text">
              {warehouse.name}
            </h1>
            {(warehouse.address?.city || warehouse.address?.country) && (
              <p className="m-0 mt-1 text-sm text-g-text-2">
                {[warehouse.address.city, warehouse.address.country].filter(Boolean).join(', ')}
              </p>
            )}
            <span
              className="inline-block mt-2 py-0.5 px-2.5 rounded-full text-[12px] font-medium"
              style={{ background: warehouse.isActive ? '#e6f4ea' : '#f1f3f4', color: warehouse.isActive ? '#137333' : '#5f6368' }}
            >
              {warehouse.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {perms.edit_warehouses && !editing && (
            <button onClick={() => setEditing(true)} className={btnOutline}>{tp.editWarehouse}</button>
          )}
          {perms.delete_warehouses && !editing && (
            <button onClick={() => setDeleteOpen(true)} className={btnFilled} style={{ background: '#d93025' }}>{tp.deleteWarehouse}</button>
          )}
        </div>
      </FormCard>

      {/* Items count */}
      <FormCard className="flex items-center justify-between">
        <div>
          <p className={`m-0 ${fieldLabelCls}`}>Stored items</p>
          <p className={`m-0 mt-0.5 text-base font-medium text-g-text`}>{tp.itemsCount(itemCount)}</p>
        </div>
        {itemCount > 0 && (
          <Link
            href={`/inventory?warehouse=${params.id}`}
            className="ripple bg-transparent text-google-blue border border-google-blue rounded-full py-2 px-4 text-sm font-medium no-underline inline-flex items-center gap-1.5 transition-google"
          >
            {tp.viewItems}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
          </Link>
        )}
      </FormCard>

      {/* Info section */}
      <FormCard>
        <FormSectionLabel>{tp.infoSection}</FormSectionLabel>
        {!editing ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className={`m-0 ${fieldLabelCls}`}>{tp.fields.name}</p>
              <p className={`m-0 mt-0.5 ${fieldValueCls}`}>{warehouse.name}</p>
            </div>
            {warehouse.description && (
              <div>
                <p className={`m-0 ${fieldLabelCls}`}>{tp.fields.description}</p>
                <p className={`m-0 mt-0.5 ${fieldValueCls}`}>{warehouse.description}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label={`${tp.fields.name} *`}>
              <FormInput value={editForm.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label={tp.fields.description}>
              <FormInput value={editForm.description} onChange={e => set('description', e.target.value)} />
            </Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive !== false}
                onChange={e => set('isActive', e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm text-g-text cursor-pointer">{tp.fields.isActive}</label>
            </div>
          </div>
        )}
      </FormCard>

      {/* Address & Location */}
      <FormCard>
        <FormSectionLabel>{tp.addressSection}</FormSectionLabel>
        {!editing ? (
          <>
            {(() => {
              const addr = warehouse.address || {};
              const hasAddr = addr.street || addr.city || addr.postalCode || addr.state || addr.country;
              return hasAddr ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4">
                  {addr.street && <div className="sm:col-span-2"><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.street}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.street}</p></div>}
                  {addr.city && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.city}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.city}</p></div>}
                  {addr.postalCode && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.postalCode}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.postalCode}</p></div>}
                  {addr.state && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.state}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.state}</p></div>}
                  {addr.country && <div><p className={`m-0 ${fieldLabelCls}`}>{tp.fields.country}</p><p className={`m-0 mt-0.5 ${fieldValueCls}`}>{addr.country}</p></div>}
                </div>
              ) : (
                <p className="m-0 mb-4 text-sm text-g-text-3">{tp.noAddress}</p>
              );
            })()}
            {hasCoords ? (
              <WarehouseMap lat={warehouse.coordinates.lat} lng={warehouse.coordinates.lng} />
            ) : (
              <p className="m-0 text-sm text-g-text-3">No location pin set.</p>
            )}
          </>
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
            <div className="mt-2">
              <WarehouseMap
                lat={editForm.coordinates.lat}
                lng={editForm.coordinates.lng}
                onLocationChange={setCoords}
                address={editAddressString}
              />
            </div>
          </div>
        )}
      </FormCard>

      {/* Notes */}
      <FormCard>
        <FormSectionLabel>{tp.notesSection}</FormSectionLabel>
        {!editing ? (
          <p className={`m-0 text-sm leading-relaxed whitespace-pre-wrap ${warehouse.notes ? 'text-g-text' : 'text-g-text-3'}`}>
            {warehouse.notes || tp.noNotes}
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
          <button onClick={() => { setEditing(false); seedEditForm(warehouse); }} disabled={saving} className={btnOutline}>
            {tp.cancelEdit}
          </button>
          <button onClick={handleSave} disabled={saving} className={btnFilled}>
            {saving ? '…' : tp.saveWarehouse}
          </button>
        </div>
      )}
    </div>
  );
}

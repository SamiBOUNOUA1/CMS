// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT, useLanguage } from '@/lib/LanguageContext';
import { format } from 'date-fns';

export default function InventoryItemPage({ params }) {
  const t = useT();
  const { currency } = useLanguage();
  const router = useRouter();
  const ti = t.inventoryPage.itemDetail;

  const isNew = params.id === 'new';

  const [item, setItem] = useState({
    name: '', category: '', unit: 'unit', currentStock: 0,
    minStock: 0, unitCost: 0, supplier: '', notes: '', imageUrl: '', isActive: true, laundryEligible: false,
  });
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [adjForm, setAdjForm] = useState({ adjustmentType: 'purchase', quantity: 1, notes: '' });
  const [adjSaving, setAdjSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [user, setUser] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
    fetch('/api/inventory/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(d => setCategories(d.categories ?? []));
    fetch('/api/inventory/suppliers?isActive=true')
      .then(r => r.ok ? r.json() : { suppliers: [] })
      .then(d => setSuppliers(d.suppliers ?? []));
  }, []);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/inventory/items/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.item) {
          setItem({ ...d.item, category: d.item.category?._id ?? '', supplier: d.item.supplier?._id ?? '' });
        }
        setLoading(false);
      });
    fetch(`/api/inventory/adjustments?item=${params.id}`)
      .then(r => r.ok ? r.json() : { adjustments: [] })
      .then(d => setAdjustments(d.adjustments ?? []));
  }, [params.id]);

  const canEdit = user?.permissions?.manage_inventory;
  const isLowStock = !isNew && item.currentStock <= item.minStock;

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isNew ? '/api/inventory/items' : `/api/inventory/items/${params.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (isNew) {
        router.push(`/inventory/${d.item._id}`);
      } else {
        setItem({ ...d.item, category: d.item.category?._id ?? '', supplier: d.item.supplier?._id ?? '' });
        setEditing(false);
        showToast(ti.saved);
      }
    } catch {
      showToast(ti.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/items/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/inventory');
    } catch {
      showToast(ti.deleteFailed);
    }
  };

  const handleAdjust = async () => {
    if (!adjForm.quantity) return;
    setAdjSaving(true);
    const delta = adjForm.adjustmentType === 'usage' || adjForm.adjustmentType === 'write-off'
      ? -Math.abs(adjForm.quantity)
      : Math.abs(adjForm.quantity);
    try {
      const res = await fetch(`/api/inventory/items/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockDelta: delta, adjustmentType: adjForm.adjustmentType, notes: adjForm.notes }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setItem({ ...d.item, category: d.item.category?._id ?? '' });
      fetch(`/api/inventory/adjustments?item=${params.id}`)
        .then(r => r.ok ? r.json() : { adjustments: [] })
        .then(d2 => setAdjustments(d2.adjustments ?? []));
      setAdjForm({ adjustmentType: 'purchase', quantity: 1, notes: '' });
      setShowAdjForm(false);
      showToast(ti.adjustmentSaved);
    } catch {
      showToast(ti.adjustmentFailed);
    } finally {
      setAdjSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/inventory/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      const patchRes = await fetch(`/api/inventory/items/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!patchRes.ok) throw new Error();
      const d = await patchRes.json();
      setItem(prev => ({ ...prev, imageUrl: d.item.imageUrl }));
      showToast(ti.saved);
    } catch {
      showToast(ti.image.uploadError);
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    try {
      const res = await fetch(`/api/inventory/items/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: '' }),
      });
      if (!res.ok) throw new Error();
      setItem(prev => ({ ...prev, imageUrl: '' }));
      showToast(ti.saved);
    } catch {
      showToast(ti.saveFailed);
    }
  };

  const inputCls = 'w-full py-2 px-3 rounded-lg border border-g-border text-sm bg-g-surface text-g-text outline-none focus:border-google-blue transition-colors disabled:opacity-60 disabled:cursor-default';
  const labelCls = 'text-[11px] font-semibold text-g-text-2 uppercase tracking-wider mb-1.5 block';

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-g-text-2 text-sm">
        <div className="w-5 h-5 rounded-full border-2 border-g-border border-t-google-blue animate-spin" />
        {ti.loadFailed}
      </div>
    );
  }

  return (
    <div className="max-w-[820px] px-6 sm:px-8 pt-8 pb-12">
      {/* Back */}
      <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm text-g-text-2 no-underline mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {ti.back}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <h1 className="text-[22px] font-medium text-g-text m-0">
            {isNew ? t.inventoryPage.newItem : item.name}
          </h1>
          {!isNew && (
            <span className={`inline-flex items-center py-1 px-3 rounded-full text-[13px] font-semibold flex-shrink-0 ${
              isLowStock ? 'bg-google-red-light text-google-red' : 'bg-google-green-light text-google-green'
            }`}>
              {item.currentStock} {item.unit}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!isNew && canEdit && (
            editing ? (
              <>
                <button onClick={() => setEditing(false)} className="ripple py-2 px-4 rounded-full border border-g-border bg-transparent text-sm font-medium cursor-pointer text-g-text-2 transition-google">
                  {ti.cancelEdit}
                </button>
                <button onClick={handleSave} disabled={saving} className="ripple py-2 px-5 rounded-full border-none bg-google-blue text-white text-sm font-medium cursor-pointer shadow-google-1 transition-google">
                  {saving ? '…' : ti.saveItem}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setDeleteDialog(true)} className="ripple py-2 px-4 rounded-full border border-google-red bg-transparent text-google-red text-sm font-medium cursor-pointer transition-google">
                  {ti.deleteItem}
                </button>
                <button onClick={() => setEditing(true)} className="ripple py-2 px-5 rounded-full border-none bg-google-blue text-white text-sm font-medium cursor-pointer shadow-google-1 transition-google">
                  {ti.editItem}
                </button>
              </>
            )
          )}
          {isNew && (
            <button onClick={handleSave} disabled={saving} className="ripple py-2 px-5 rounded-full border-none bg-google-blue text-white text-sm font-medium cursor-pointer shadow-google-1 transition-google">
              {saving ? '…' : ti.saveItem}
            </button>
          )}
        </div>
      </div>

      {/* Image */}
      {!isNew && (
        <div className="bg-g-surface border border-g-border rounded-2xl p-5 mb-4 flex items-center gap-5 flex-wrap shadow-google-1">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-[112px] h-[112px] object-cover rounded-xl border border-g-border flex-shrink-0" />
          ) : (
            <div className="w-[112px] h-[112px] rounded-xl border-2 border-dashed border-g-border flex items-center justify-center bg-g-bg flex-shrink-0 text-g-text-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          {canEdit && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-g-text-2 uppercase tracking-wider m-0">{ti.image.upload}</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="ripple py-1.5 px-4 rounded-full border border-g-border bg-transparent text-[13px] font-medium cursor-pointer text-g-text-2 transition-google w-fit"
              >
                {imageUploading ? ti.image.uploading : ti.image.upload}
              </button>
              {item.imageUrl && (
                <button
                  onClick={handleRemoveImage}
                  className="ripple py-1.5 px-4 rounded-full border border-google-red bg-transparent text-[13px] font-medium cursor-pointer text-google-red transition-google w-fit"
                >
                  {ti.image.remove}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Details form */}
      <div className="bg-g-surface border border-g-border rounded-2xl p-6 mb-4 shadow-google-1">
        <h2 className="text-[13px] font-semibold text-g-text-2 uppercase tracking-wider mb-5 flex items-center gap-2 m-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-google-blue">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          Details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>{ti.fields.name} *</label>
            <input value={item.name} onChange={e => setItem(i => ({ ...i, name: e.target.value }))} disabled={!editing} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{ti.fields.category}</label>
            <select value={item.category} onChange={e => setItem(i => ({ ...i, category: e.target.value }))} disabled={!editing} className={inputCls}>
              <option value="">{ti.fields.noCategory}</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ti.fields.unit}</label>
            <input value={item.unit} onChange={e => setItem(i => ({ ...i, unit: e.target.value }))} disabled={!editing} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{ti.fields.currentStock}</label>
            <input type="number" min="0" value={item.currentStock} onChange={e => setItem(i => ({ ...i, currentStock: Number(e.target.value) }))} disabled={!editing} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{ti.fields.minStock}</label>
            <input type="number" min="0" value={item.minStock} onChange={e => setItem(i => ({ ...i, minStock: Number(e.target.value) }))} disabled={!editing} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{ti.fields.unitCost}</label>
            <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => setItem(i => ({ ...i, unitCost: Number(e.target.value) }))} disabled={!editing} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{ti.fields.supplier}</label>
            <select value={item.supplier} onChange={e => setItem(i => ({ ...i, supplier: e.target.value }))} disabled={!editing} className={inputCls}>
              <option value="">{ti.fields.noSupplier}</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>{ti.fields.notes}</label>
            <textarea value={item.notes} onChange={e => setItem(i => ({ ...i, notes: e.target.value }))} disabled={!editing} rows={3} className={`${inputCls} resize-vertical`} />
          </div>
          <div className="col-span-2 flex items-center gap-2.5 py-1">
            <input
              id="laundryEligible"
              type="checkbox"
              checked={!!item.laundryEligible}
              onChange={e => setItem(i => ({ ...i, laundryEligible: e.target.checked }))}
              disabled={!editing}
              style={{ width: 16, height: 16, cursor: editing ? 'pointer' : 'default', accentColor: '#1a73e8' }}
            />
            <label htmlFor="laundryEligible" className="text-sm text-g-text select-none" style={{ cursor: editing ? 'pointer' : 'default' }}>
              {ti.fields.laundryEligible}
            </label>
          </div>
        </div>
      </div>

      {/* Adjust Stock */}
      {!isNew && canEdit && (
        <div className="bg-g-surface border border-g-border rounded-2xl p-6 mb-4 shadow-google-1">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-g-text m-0 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-google-green">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              {ti.adjustStock}
            </h2>
            <button
              onClick={() => setShowAdjForm(v => !v)}
              className="ripple py-1.5 px-4 rounded-full border border-g-border bg-transparent text-[13px] font-medium cursor-pointer text-g-text-2 transition-google"
            >
              {showAdjForm ? ti.cancelEdit : ti.adjustStock}
            </button>
          </div>

          {showAdjForm && (
            <div className="mt-4 pt-4 border-t border-g-border grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ti.adjustForm.type}</label>
                <select value={adjForm.adjustmentType} onChange={e => setAdjForm(f => ({ ...f, adjustmentType: e.target.value }))} className={inputCls}>
                  {Object.entries(ti.adjustForm.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{ti.adjustForm.quantity}</label>
                <input type="number" min="1" value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{ti.adjustForm.notes}</label>
                <input value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
              </div>
              <div className="col-span-2">
                <button onClick={handleAdjust} disabled={adjSaving} className="ripple py-2 px-5 rounded-full border-none bg-google-green text-white text-sm font-medium cursor-pointer shadow-google-1 transition-google">
                  {adjSaving ? ti.adjustForm.submitting : ti.adjustForm.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjustment history */}
      {!isNew && (
        <div className="bg-g-surface border border-g-border rounded-2xl p-6 shadow-google-1">
          <h2 className="text-[15px] font-medium text-g-text m-0 mb-4 flex items-center gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="text-g-text-3">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
            {ti.adjustmentHistory}
          </h2>
          {adjustments.length === 0 ? (
            <p className="text-sm text-g-text-2 m-0">{ti.noAdjustments}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr className="border-b border-g-border">
                    {['Date', 'Type', 'Qty', 'Notes', 'By'].map(h => (
                      <th key={h} className="py-2 px-3 text-left text-[11px] font-semibold text-g-text-2 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map(adj => {
                    const typeLabel = ti.adjustForm.types[adj.adjustmentType] ?? adj.adjustmentType;
                    const isPositive = adj.quantity > 0;
                    return (
                      <tr key={adj._id} className="border-b border-g-border last:border-b-0 hover:bg-g-bg transition-colors">
                        <td className="py-2.5 px-3 text-g-text-2">{format(new Date(adj.date), 'dd MMM yyyy')}</td>
                        <td className="py-2.5 px-3">
                          <span className="py-0.5 px-2.5 rounded-full text-[11px] font-medium" style={{
                            background: isPositive ? '#e6f4ea' : '#fce8e6',
                            color: isPositive ? '#137333' : '#d93025',
                          }}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold" style={{ color: isPositive ? '#137333' : '#d93025' }}>
                          {isPositive ? `+${adj.quantity}` : adj.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-g-text-2">{adj.notes || '—'}</td>
                        <td className="py-2.5 px-3 text-g-text-2">{adj.performedBy?.name ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete dialog */}
      {deleteDialog && (
        <>
          <div onClick={() => setDeleteDialog(false)} className="fixed inset-0 bg-black/45 z-[199]" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-g-surface rounded-2xl p-7 z-[200] min-w-[320px] shadow-google-3">
            <h3 className="m-0 mb-2 text-[17px] font-medium text-g-text">{ti.deleteDialog.title}</h3>
            <p className="m-0 mb-6 text-sm text-g-text-2 leading-relaxed">{ti.deleteDialog.body}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteDialog(false)} className="ripple py-2 px-4 rounded-full border border-g-border bg-transparent text-sm font-medium cursor-pointer text-g-text-2">
                {ti.deleteDialog.cancel}
              </button>
              <button onClick={handleDelete} className="ripple py-2 px-4 rounded-full border-none bg-google-red text-white text-sm font-medium cursor-pointer">
                {ti.deleteDialog.delete}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#323232] text-white py-2.5 px-5 rounded-lg text-sm z-[200] shadow-google-2">
          {toast}
        </div>
      )}
    </div>
  );
}

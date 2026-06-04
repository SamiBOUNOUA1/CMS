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
    minStock: 0, unitCost: 0, supplier: '', notes: '', imageUrl: '', isActive: true,
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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

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
        body: JSON.stringify({
          stockDelta: delta,
          adjustmentType: adjForm.adjustmentType,
          notes: adjForm.notes,
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setItem({ ...d.item, category: d.item.category?._id ?? '' });
      // Refresh adjustments
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

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--google-border)',
    fontSize: 14, background: 'var(--google-surface)', color: 'var(--google-text-primary)',
    width: '100%', fontFamily: 'inherit',
  };
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--google-text-secondary)', marginBottom: 4, display: 'block' };
  const fieldRow = { marginBottom: 16 };

  if (loading) {
    return <div style={{ padding: 32, fontSize: 14, color: 'var(--google-text-secondary)' }}>{ti.loadFailed}</div>;
  }

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 800 }}>
      {/* Back */}
      <Link href="/inventory" style={{ fontSize: 14, color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← {ti.back}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--google-text-primary)' }}>
          {isNew ? t.inventoryPage.newItem : item.name}
        </h1>
        {!isNew && canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--google-border)', background: 'transparent', fontSize: 14, cursor: 'pointer', color: 'var(--google-text-secondary)' }}>
                  {ti.cancelEdit}
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  {saving ? '…' : ti.saveItem}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setDeleteDialog(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d93025', background: 'transparent', color: '#d93025', fontSize: 14, cursor: 'pointer' }}>
                  {ti.deleteItem}
                </button>
                <button onClick={() => setEditing(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  {ti.editItem}
                </button>
              </>
            )}
          </div>
        )}
        {isNew && (
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {saving ? '…' : ti.saveItem}
          </button>
        )}
      </div>

      {/* Image */}
      {!isNew && (
        <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--google-border)', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: 8, border: '2px dashed var(--google-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, background: 'var(--google-bg)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--google-text-tertiary)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          {canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--google-border)', background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--google-text-secondary)' }}
              >
                {imageUploading ? ti.image.uploading : ti.image.upload}
              </button>
              {item.imageUrl && (
                <button
                  onClick={handleRemoveImage}
                  style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #d93025', background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#d93025' }}
                >
                  {ti.image.remove}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1', ...fieldRow }}>
            <label style={labelStyle}>{ti.fields.name} *</label>
            <input
              value={item.name}
              onChange={e => setItem(i => ({ ...i, name: e.target.value }))}
              disabled={!editing}
              style={inputStyle}
            />
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>{ti.fields.category}</label>
            <select
              value={item.category}
              onChange={e => setItem(i => ({ ...i, category: e.target.value }))}
              disabled={!editing}
              style={inputStyle}
            >
              <option value="">{ti.fields.noCategory}</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>{ti.fields.unit}</label>
            <input value={item.unit} onChange={e => setItem(i => ({ ...i, unit: e.target.value }))} disabled={!editing} style={inputStyle} />
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>{ti.fields.currentStock}</label>
            <input type="number" min="0" value={item.currentStock} onChange={e => setItem(i => ({ ...i, currentStock: Number(e.target.value) }))} disabled={!editing} style={inputStyle} />
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>{ti.fields.minStock}</label>
            <input type="number" min="0" value={item.minStock} onChange={e => setItem(i => ({ ...i, minStock: Number(e.target.value) }))} disabled={!editing} style={inputStyle} />
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>{ti.fields.unitCost}</label>
            <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => setItem(i => ({ ...i, unitCost: Number(e.target.value) }))} disabled={!editing} style={inputStyle} />
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>{ti.fields.supplier}</label>
            <select value={item.supplier} onChange={e => setItem(i => ({ ...i, supplier: e.target.value }))} disabled={!editing} style={inputStyle}>
              <option value="">{ti.fields.noSupplier}</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1', ...fieldRow }}>
            <label style={labelStyle}>{ti.fields.notes}</label>
            <textarea value={item.notes} onChange={e => setItem(i => ({ ...i, notes: e.target.value }))} disabled={!editing} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Adjust Stock */}
      {!isNew && canEdit && (
        <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAdjForm ? 16 : 0 }}>
            <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--google-text-primary)' }}>
              {ti.adjustStock}
            </h2>
            <button
              onClick={() => setShowAdjForm(v => !v)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--google-border)', background: 'transparent', fontSize: 14, cursor: 'pointer', color: 'var(--google-text-secondary)' }}
            >
              {showAdjForm ? ti.cancelEdit : ti.adjustStock}
            </button>
          </div>

          {showAdjForm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{ti.adjustForm.type}</label>
                <select value={adjForm.adjustmentType} onChange={e => setAdjForm(f => ({ ...f, adjustmentType: e.target.value }))} style={inputStyle}>
                  {Object.entries(ti.adjustForm.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{ti.adjustForm.quantity}</label>
                <input type="number" min="1" value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: Number(e.target.value) }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>{ti.adjustForm.notes}</label>
                <input value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button onClick={handleAdjust} disabled={adjSaving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  {adjSaving ? ti.adjustForm.submitting : ti.adjustForm.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjustment history */}
      {!isNew && (
        <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, margin: '0 0 16px', color: 'var(--google-text-primary)' }}>
            {ti.adjustmentHistory}
          </h2>
          {adjustments.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--google-text-secondary)', margin: 0 }}>{ti.noAdjustments}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--google-border)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--google-text-secondary)', fontWeight: 500 }}>Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--google-text-secondary)', fontWeight: 500 }}>Type</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--google-text-secondary)', fontWeight: 500 }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--google-text-secondary)', fontWeight: 500 }}>Notes</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--google-text-secondary)', fontWeight: 500 }}>By</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map(adj => {
                  const typeLabel = ti.adjustForm.types[adj.adjustmentType] ?? adj.adjustmentType;
                  const isPositive = adj.quantity > 0;
                  return (
                    <tr key={adj._id} style={{ borderBottom: '1px solid var(--google-border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--google-text-secondary)' }}>
                        {format(new Date(adj.date), 'dd MMM yyyy')}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: isPositive ? '#e6f4ea' : '#fce8e6',
                          color: isPositive ? '#137333' : '#d93025',
                        }}>
                          {typeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: isPositive ? '#137333' : '#d93025' }}>
                        {isPositive ? `+${adj.quantity}` : adj.quantity}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--google-text-secondary)' }}>{adj.notes || '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--google-text-secondary)' }}>
                        {adj.performedBy?.name ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Delete dialog */}
      {deleteDialog && (
        <>
          <div onClick={() => setDeleteDialog(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 199 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--google-surface)', borderRadius: 12, padding: 28,
            zIndex: 200, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
          }}>
            <h3 style={{ margin: '0 0 10px', fontFamily: "'Google Sans'", fontSize: 17 }}>{ti.deleteDialog.title}</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--google-text-secondary)' }}>{ti.deleteDialog.body}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteDialog(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--google-border)', background: 'transparent', fontSize: 14, cursor: 'pointer' }}>
                {ti.deleteDialog.cancel}
              </button>
              <button onClick={handleDelete} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#d93025', color: '#fff', fontSize: 14, cursor: 'pointer' }}>
                {ti.deleteDialog.delete}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#323232', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 14, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

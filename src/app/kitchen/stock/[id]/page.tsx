'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';
import { FormInput, FormSelect, FormTextarea, Field } from '@/app/components/FormPrimitives';

const ACCENT = '#e37400';
const CATEGORIES = ['vegetables', 'dairy', 'meat', 'dry', 'spices', 'beverages', 'other'] as const;
const ADJ_TYPES = ['purchase', 'usage', 'write-off', 'return'] as const;

const ADJ_COLORS: Record<string, { bg: string; color: string }> = {
  purchase:   { bg: '#e6f4ea', color: '#137333' },
  usage:      { bg: '#fce8e6', color: '#d93025' },
  'write-off':{ bg: '#fff3e0', color: '#b06000' },
  return:     { bg: '#e8f0fe', color: '#1a73e8' },
};

export default function KitchenStockItemPage({ params }: { params: { id: string } }) {
  const t = useT();
  const router = useRouter();
  const tk = (t as any).kitchenPage.stock.itemDetail;
  const tCats = (t as any).kitchenPage.stock.categories;
  const tAdj = tk.adjustForm;

  const isNew = params.id === 'new';

  const [item, setItem] = useState<any>({
    name: '', category: 'other', unit: 'kg', currentStock: 0, minStock: 0, unitCost: 0, notes: '', isActive: true,
  });
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [adjForm, setAdjForm] = useState({ adjustmentType: 'purchase', quantity: '', notes: '' });
  const [adjSaving, setAdjSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
  }, []);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/kitchen/stock/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setItem(d.item); setAdjustments(d.adjustments ?? []); }
        setLoading(false);
      });
  }, [params.id, isNew]);

  const canManage = user?.permissions?.manage_kitchen;
  const isLow = !isNew && item.currentStock < item.minStock;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  async function handleSave() {
    if (!item.name?.trim()) return;
    setSaving(true);
    try {
      const method = isNew ? 'POST' : 'PATCH';
      const url = isNew ? '/api/kitchen/stock' : `/api/kitchen/stock/${params.id}`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name, category: item.category, unit: item.unit, currentStock: isNew ? item.currentStock : undefined, minStock: item.minStock, unitCost: item.unitCost, notes: item.notes, isActive: item.isActive }),
      });
      if (res.ok) {
        const d = await res.json();
        if (isNew) router.push(`/kitchen/stock/${d.item._id}`);
        else { setItem(d.item); setEditing(false); showToast(tk.saved); }
      } else {
        showToast(tk.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/kitchen/stock/${params.id}`, { method: 'DELETE' });
    if (res.status === 409) {
      setDeleteDialog(false);
      showToast(tk.deleteInUse);
    } else if (res.ok) {
      router.push('/kitchen/stock');
    } else {
      showToast(tk.deleteFailed);
    }
  }

  async function handleAdjustment() {
    const qty = Number(adjForm.quantity);
    if (!qty) return;
    setAdjSaving(true);
    const delta = ['purchase', 'return'].includes(adjForm.adjustmentType) ? Math.abs(qty) : -Math.abs(qty);
    try {
      const res = await fetch(`/api/kitchen/stock/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockDelta: delta, adjustmentType: adjForm.adjustmentType, notes: adjForm.notes }),
      });
      if (res.ok) {
        const d = await res.json();
        setItem(d.item);
        // Refresh adjustments
        fetch(`/api/kitchen/stock/${params.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setAdjustments(d.adjustments ?? []));
        setAdjForm({ adjustmentType: 'purchase', quantity: '', notes: '' });
        setShowAdjForm(false);
        showToast(tk.adjustmentSaved);
      } else {
        showToast(tk.adjustmentFailed);
      }
    } finally {
      setAdjSaving(false);
    }
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>{(t as any).kitchenPage.stock.loading}</div>;
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      {/* Back */}
      <button onClick={() => router.push('/kitchen/stock')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontWeight: 600, fontSize: 14, padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← {tk.back}
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#202124', margin: 0 }}>
          {isNew ? tk.newTitle : item.name}
        </h1>
        {canManage && !isNew && (
          <div style={{ display: 'flex', gap: 10 }}>
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{tk.cancel}</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{saving ? tk.saving : tk.save}</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{tk.edit}</button>
                <button onClick={() => setDeleteDialog(true)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d93025', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{tk.delete}</button>
              </>
            )}
          </div>
        )}
        {isNew && canManage && (
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{saving ? tk.saving : tk.save}</button>
        )}
      </div>

      {/* Low stock warning */}
      {isLow && (
        <div style={{ background: '#fce8e6', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#d93025', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠ {tk.lowStockWarning}
        </div>
      )}

      {/* Info Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(60,64,67,.3)', padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px 24px' }}>
          <Field label={tk.fields.name}>
            <FormInput value={item.name} onChange={e => setItem((p: any) => ({ ...p, name: e.target.value }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.category}>
            <FormSelect value={item.category} onChange={e => setItem((p: any) => ({ ...p, category: e.target.value }))} disabled={!editing}>
              {CATEGORIES.map(c => <option key={c} value={c}>{tCats[c]}</option>)}
            </FormSelect>
          </Field>
          <Field label={tk.fields.unit}>
            <FormInput value={item.unit} onChange={e => setItem((p: any) => ({ ...p, unit: e.target.value }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.currentStock}>
            <FormInput type="number" value={item.currentStock} onChange={e => setItem((p: any) => ({ ...p, currentStock: Number(e.target.value) }))} disabled={!isNew} />
          </Field>
          <Field label={tk.fields.minStock}>
            <FormInput type="number" value={item.minStock} onChange={e => setItem((p: any) => ({ ...p, minStock: Number(e.target.value) }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.unitCost}>
            <FormInput type="number" step="0.01" value={item.unitCost} onChange={e => setItem((p: any) => ({ ...p, unitCost: Number(e.target.value) }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.notes} style={{ gridColumn: '1 / -1' }}>
            <FormTextarea value={item.notes} onChange={e => setItem((p: any) => ({ ...p, notes: e.target.value }))} disabled={!editing} rows={3} />
          </Field>
        </div>
        {editing && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#202124' }}>
              <input type="checkbox" checked={item.isActive} onChange={e => setItem((p: any) => ({ ...p, isActive: e.target.checked }))} />
              {tk.fields.isActive}
            </label>
          </div>
        )}
      </div>

      {/* Stock Adjustment Section */}
      {!isNew && canManage && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(60,64,67,.3)', padding: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAdjForm ? 20 : 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#202124' }}>{tk.adjustStock}</h3>
            <button
              onClick={() => setShowAdjForm(v => !v)}
              style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: showAdjForm ? ACCENT : '#fff', color: showAdjForm ? '#fff' : ACCENT, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              {showAdjForm ? '−' : '+'} {tk.adjustStock}
            </button>
          </div>
          {showAdjForm && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px 20px' }}>
              <Field label={tAdj.type}>
                <FormSelect value={adjForm.adjustmentType} onChange={e => setAdjForm(p => ({ ...p, adjustmentType: e.target.value }))}>
                  {ADJ_TYPES.map(t => <option key={t} value={t}>{tAdj.types[t]}</option>)}
                </FormSelect>
              </Field>
              <Field label={tAdj.quantity}>
                <FormInput type="number" min="0.01" step="0.01" value={adjForm.quantity} onChange={e => setAdjForm(p => ({ ...p, quantity: e.target.value }))} />
              </Field>
              <Field label={tAdj.notes} style={{ gridColumn: '1 / -1' }}>
                <FormInput value={adjForm.notes} onChange={e => setAdjForm(p => ({ ...p, notes: e.target.value }))} />
              </Field>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleAdjustment} disabled={adjSaving || !adjForm.quantity} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {adjSaving ? tAdj.submitting : tAdj.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjustment History */}
      {!isNew && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(60,64,67,.3)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#202124' }}>{tk.adjustmentHistory}</h3>
          {adjustments.length === 0 ? (
            <p style={{ color: '#5f6368', fontSize: 14, margin: 0 }}>{tk.noAdjustments}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e8eaed' }}>
                  {[tk.adjTable.date, tk.adjTable.type, tk.adjTable.qty, tk.adjTable.by, tk.adjTable.notes].map((h, i) => (
                    <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj: any) => {
                  const cfg = ADJ_COLORS[adj.adjustmentType] ?? { bg: '#f1f3f4', color: '#5f6368' };
                  return (
                    <tr key={adj._id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td style={{ padding: '10px 12px', color: '#5f6368', fontSize: 13 }}>{fmtDate(adj.createdAt)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                          {tAdj.types[adj.adjustmentType as keyof typeof tAdj.types] || adj.adjustmentType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: adj.quantity >= 0 ? '#137333' : '#d93025' }}>
                        {adj.quantity > 0 ? '+' : ''}{adj.quantity} {item.unit}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#5f6368', fontSize: 13 }}>{adj.performedBy?.name || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#5f6368', fontSize: 13 }}>{adj.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      {deleteDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: '#202124' }}>{tk.deleteDialog.title}</div>
            <div style={{ color: '#5f6368', marginBottom: 24, fontSize: 14 }}>{tk.deleteDialog.body}</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteDialog(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>{tk.deleteDialog.cancel}</button>
              <button onClick={handleDelete} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#d93025', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{tk.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#202124', color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: 14, zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';

const STATUS_ORDER = ['draft', 'sent', 'returned', 'completed'] as const;
type BatchStatus = typeof STATUS_ORDER[number];

const STATUS_CONFIG: Record<string, { bg: string; color: string; fill: string }> = {
  draft:     { bg: '#f1f3f4', color: '#5f6368', fill: '#5f6368' },
  sent:      { bg: '#e8f0fe', color: '#1a73e8', fill: '#1a73e8' },
  returned:  { bg: '#fef7e0', color: '#b06000', fill: '#e37400' },
  completed: { bg: '#e6f4ea', color: '#137333', fill: '#137333' },
};

const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

function genTempId() {
  return Math.random().toString(36).slice(2);
}

export default function LaundryBatchPage({ params }: { params: { id: string } }) {
  const t = useT();
  const router = useRouter();
  const tl = t.laundryPage;
  const td = tl.batchDetail;
  const isNew = params.id === 'new';

  const [batch, setBatch] = useState<any>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    order: '',
    notes: '',
    items: [] as any[],
  });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [recordingReturns, setRecordingReturns] = useState(false);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
    fetch('/api/inventory/items?laundryEligible=true').then(r => r.ok ? r.json() : { items: [] }).then((d: any) => setInventoryItems(d.items ?? []));
    fetch('/api/orders').then(r => r.ok ? r.json() : { orders: [] }).then((d: any) => setOrders(d.orders ?? []));
  }, []);

  const loadBatch = useCallback(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/laundry/batches/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (!d) { showToast(td.loadFailed); return; }
        setBatch(d.batch);
        setForm({
          date: d.batch.date ? d.batch.date.slice(0, 10) : '',
          order: d.batch.order?._id ?? '',
          notes: d.batch.notes ?? '',
          items: (d.batch.items ?? []).map((it: any) => ({
            ...it,
            _tempId: genTempId(),
            inventoryItem: it.inventoryItem?._id ?? it.inventoryItem,
          })),
        });
        setLoading(false);
      });
  }, [isNew, params.id, td]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  const canManage = user?.permissions?.manage_laundry;

  function addItem() {
    setForm(f => ({
      ...f,
      items: [...f.items, { _tempId: genTempId(), inventoryItem: '', quantitySent: 1, notes: '' }],
    }));
  }

  function removeItem(tempId: string) {
    setForm(f => ({ ...f, items: f.items.filter(it => it._tempId !== tempId) }));
  }

  function updateItem(tempId: string, field: string, value: unknown) {
    setForm(f => ({
      ...f,
      items: f.items.map(it => it._tempId === tempId ? { ...it, [field]: value } : it),
    }));
  }

  function updateReturnItem(id: string, field: string, value: number) {
    setReturnItems(prev => prev.map(it => it._id === id ? { ...it, [field]: value } : it));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      date: form.date,
      order: form.order || null,
      notes: form.notes,
      items: form.items.map(it => ({
        inventoryItem: it.inventoryItem,
        quantitySent: Number(it.quantitySent),
        notes: it.notes || '',
      })),
    };

    let res: Response;
    if (isNew) {
      res = await fetch('/api/laundry/batches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      res = await fetch(`/api/laundry/batches/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    setSaving(false);
    if (!res.ok) { showToast(td.saveFailed); return; }
    const data = await res.json();
    showToast(td.saved);
    if (isNew) {
      router.replace(`/laundry/${data.batch._id}`);
    } else {
      setBatch(data.batch);
      setEditing(false);
    }
  }

  async function markSent() {
    setSaving(true);
    const res = await fetch(`/api/laundry/batches/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    });
    setSaving(false);
    if (!res.ok) { showToast(td.statusFailed); return; }
    showToast(td.statusUpdated);
    loadBatch();
  }

  function startRecordReturns() {
    const items = (batch.items ?? []).map((it: any) => ({
      _id: it._id,
      inventoryItem: it.inventoryItem,
      quantitySent: it.quantitySent,
      quantityReturned: it.quantityReturned ?? 0,
      quantityLost: it.quantityLost ?? 0,
      quantityDamaged: it.quantityDamaged ?? 0,
      notes: it.notes ?? '',
    }));
    setReturnItems(items);
    setRecordingReturns(true);
  }

  async function saveReturns() {
    setSaving(true);
    const res = await fetch(`/api/laundry/batches/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'returned', items: returnItems }),
    });
    setSaving(false);
    if (!res.ok) { showToast(td.statusFailed); return; }
    showToast(td.statusUpdated);
    setRecordingReturns(false);
    loadBatch();
  }

  async function completeBatch() {
    setSaving(true);
    const res = await fetch(`/api/laundry/batches/${params.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    setSaving(false);
    setCompleteDialog(false);
    if (!res.ok) { showToast(td.completeFailed); return; }
    showToast(td.completedMsg);
    loadBatch();
  }

  async function handleDelete() {
    const res = await fetch(`/api/laundry/batches/${params.id}`, { method: 'DELETE' });
    if (!res.ok) { showToast(td.deleteFailed); return; }
    showToast(td.deleted);
    router.push('/laundry');
  }

  const writeOffItems = (batch?.items ?? []).filter((it: any) => (it.quantityLost || 0) + (it.quantityDamaged || 0) > 0);
  const writeOffCount = writeOffItems.length;

  function getInventoryName(id: string) {
    const found = inventoryItems.find(i => i._id === id);
    return found?.name ?? id;
  }

  // ── Shared styles ───────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
    marginBottom: 16, overflow: 'hidden',
  };

  const cardHeaderStyle: React.CSSProperties = {
    padding: '14px 20px', borderBottom: '1px solid #f1f3f4',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #dadce0', borderRadius: 8,
    fontSize: 14, color: '#202124', fontFamily: 'Roboto, sans-serif',
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  };

  const disabledInputStyle: React.CSSProperties = {
    ...inputStyle, background: '#f8f9fa', color: '#5f6368',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11,
    fontWeight: 600, color: '#5f6368', textTransform: 'uppercase',
    letterSpacing: '0.05em', background: '#f8f9fa',
    borderBottom: '1px solid #e8eaed',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 14, color: '#202124',
    borderBottom: '1px solid #f1f3f4', verticalAlign: 'middle',
  };

  const btnPrimaryStyle: React.CSSProperties = {
    padding: '9px 20px', borderRadius: 24, border: 'none',
    background: '#1a73e8', color: '#fff', fontSize: 14,
    fontWeight: 500, cursor: 'pointer', fontFamily: 'Roboto, sans-serif',
  };

  const btnSecondaryStyle: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 24, border: '1px solid #dadce0',
    background: '#fff', color: '#3c4043', fontSize: 14,
    fontWeight: 500, cursor: 'pointer', fontFamily: 'Roboto, sans-serif',
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ height: 13, width: 100, borderRadius: 4, background: '#f1f3f4', marginBottom: 24 }} />
        <div style={{ height: 26, width: 200, borderRadius: 4, background: '#f1f3f4', marginBottom: 32 }} />
        {[1, 2].map(i => (
          <div key={i} style={{ ...cardStyle, padding: 24, marginBottom: 16 }}>
            <div style={{ height: 13, width: 140, borderRadius: 4, background: '#f1f3f4' }} />
          </div>
        ))}
      </main>
    );
  }

  const status: BatchStatus = batch?.status ?? 'draft';
  const currentStep = STATUS_ORDER.indexOf(status);
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

      {/* Back */}
      <Link
        href="/laundry"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 2,
          fontSize: 13, color: '#5f6368', textDecoration: 'none',
          marginBottom: 18, padding: '4px 8px 4px 2px', borderRadius: 6,
        }}
      >
        <ChevronLeftIcon />
        {td.back}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif' }}>
            {isNew ? td.newTitle : (batch?.batchNumber ?? '')}
          </h1>
          {!isNew && (
            <span style={{
              display: 'inline-block', padding: '3px 12px', borderRadius: 12,
              fontSize: 12, fontWeight: 600,
              background: statusCfg.bg, color: statusCfg.color,
            }}>
              {td.stepper[status as keyof typeof td.stepper]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isNew && canManage && !editing && !recordingReturns && (
            <>
              {status === 'draft' && (
                <button onClick={() => setEditing(true)} style={btnSecondaryStyle}>{td.edit}</button>
              )}
              {status === 'draft' && (
                <button
                  onClick={() => setDeleteDialog(true)}
                  style={{ ...btnSecondaryStyle, border: '1px solid #d93025', color: '#d93025' }}
                >
                  {td.delete}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status stepper */}
      {!isNew && (
        <div style={{ ...cardStyle, padding: '20px 24px', display: 'flex', alignItems: 'center' }}>
          {STATUS_ORDER.map((s, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_ORDER.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 56 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: done ? cfg.fill : '#dadce0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    boxShadow: active ? `0 0 0 4px ${cfg.bg}` : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {i < currentStep ? <CheckIcon /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, whiteSpace: 'nowrap',
                    color: active ? cfg.fill : done ? '#3c4043' : '#9aa0a6',
                    fontWeight: active ? 600 : 400,
                  }}>
                    {td.stepper[s as keyof typeof td.stepper]}
                  </span>
                </div>
                {i < STATUS_ORDER.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 18,
                    background: i < currentStep ? '#137333' : '#e8eaed',
                    transition: 'background 0.3s',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Batch Info */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {td.infoSection}
          </h2>
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>{td.fields.date}</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              disabled={!editing && !isNew}
              style={(!editing && !isNew) ? disabledInputStyle : inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{td.fields.order}</label>
            <select
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
              disabled={!editing && !isNew}
              style={(!editing && !isNew) ? disabledInputStyle : inputStyle}
            >
              <option value="">{td.fields.noOrder}</option>
              {orders.map((o: any) => (
                <option key={o._id} value={o._id}>
                  {o.clientName} — {o.eventDate ? new Date(o.eventDate).toLocaleDateString() : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{td.fields.notes}</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              disabled={!editing && !isNew}
              style={{ ...(!editing && !isNew) ? disabledInputStyle : inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {td.itemsSection}
          </h2>
          {(editing || isNew) && (
            <button
              onClick={addItem}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 24,
                border: '1px solid #1a73e8', background: '#fff',
                color: '#1a73e8', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <PlusIcon />
              {td.items.addItem}
            </button>
          )}
        </div>

        {/* Edit / create mode */}
        {(editing || isNew) && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{td.items.inventoryItem}</th>
                  <th style={{ ...thStyle, width: 110 }}>{td.items.quantitySent}</th>
                  <th style={thStyle}>{td.items.notes}</th>
                  <th style={{ ...thStyle, width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {form.items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#9aa0a6', padding: '28px 14px', borderBottom: 'none' }}>
                      {td.items.noItems}
                    </td>
                  </tr>
                )}
                {form.items.map((item, idx) => (
                  <tr key={item._tempId} style={{ borderBottom: idx < form.items.length - 1 ? '1px solid #f1f3f4' : 'none' }}>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>
                      <select
                        value={item.inventoryItem}
                        onChange={e => updateItem(item._tempId, 'inventoryItem', e.target.value)}
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      >
                        <option value="">{td.items.noItem}</option>
                        {inventoryItems.map((inv: any) => (
                          <option key={inv._id} value={inv._id}>{inv.name} ({inv.unit})</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>
                      <input
                        type="number" min={1}
                        value={item.quantitySent}
                        onChange={e => updateItem(item._tempId, 'quantitySent', e.target.value)}
                        style={{ ...inputStyle, padding: '7px 10px', width: 90 }}
                      />
                    </td>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={e => updateItem(item._tempId, 'notes', e.target.value)}
                        style={{ ...inputStyle, padding: '7px 10px' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>
                      <button
                        onClick={() => removeItem(item._tempId)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 6, borderRadius: 6, color: '#bdc1c6',
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#d93025')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#bdc1c6')}
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View: draft or sent — sent quantities */}
        {!editing && !isNew && !recordingReturns && (status === 'draft' || status === 'sent') && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{td.items.inventoryItem}</th>
                  <th style={thStyle}>{td.items.quantitySent}</th>
                  <th style={thStyle}>{td.items.notes}</th>
                </tr>
              </thead>
              <tbody>
                {(batch?.items ?? []).map((it: any, idx: number) => (
                  <tr key={it._id} style={{ borderBottom: idx < (batch?.items?.length ?? 0) - 1 ? '1px solid #f1f3f4' : 'none' }}>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>{it.inventoryItem?.name ?? '—'}</td>
                    <td style={{ ...tdStyle, borderBottom: 'none', fontWeight: 600 }}>{it.quantitySent}</td>
                    <td style={{ ...tdStyle, borderBottom: 'none', color: '#9aa0a6' }}>{it.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View: returned / completed — full quantities */}
        {!editing && !isNew && !recordingReturns && (status === 'returned' || status === 'completed') && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{td.items.inventoryItem}</th>
                  <th style={thStyle}>{td.items.quantitySent}</th>
                  <th style={thStyle}>{td.items.quantityReturned}</th>
                  <th style={thStyle}>{td.items.quantityLost}</th>
                  <th style={thStyle}>{td.items.quantityDamaged}</th>
                  <th style={thStyle}>{td.items.notes}</th>
                </tr>
              </thead>
              <tbody>
                {(batch?.items ?? []).map((it: any, idx: number) => (
                  <tr key={it._id} style={{ borderBottom: idx < (batch?.items?.length ?? 0) - 1 ? '1px solid #f1f3f4' : 'none' }}>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>{it.inventoryItem?.name ?? '—'}</td>
                    <td style={{ ...tdStyle, borderBottom: 'none', fontWeight: 600 }}>{it.quantitySent}</td>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>{it.quantityReturned}</td>
                    <td style={{ ...tdStyle, borderBottom: 'none', color: it.quantityLost > 0 ? '#d93025' : undefined, fontWeight: it.quantityLost > 0 ? 600 : 400 }}>
                      {it.quantityLost}
                    </td>
                    <td style={{ ...tdStyle, borderBottom: 'none', color: it.quantityDamaged > 0 ? '#e37400' : undefined, fontWeight: it.quantityDamaged > 0 ? 600 : 400 }}>
                      {it.quantityDamaged}
                    </td>
                    <td style={{ ...tdStyle, borderBottom: 'none', color: '#9aa0a6' }}>{it.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Record returns mode */}
        {recordingReturns && (
          <div>
            <div style={{
              background: '#fef7e0', borderBottom: '1px solid #fdd663',
              padding: '10px 20px', display: 'flex', alignItems: 'center',
              gap: 8, color: '#b06000', fontSize: 13,
            }}>
              <WarningIcon />
              <span>Total returned + lost + damaged must not exceed sent quantity per item.</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{td.items.inventoryItem}</th>
                    <th style={thStyle}>{td.items.quantitySent}</th>
                    <th style={thStyle}>{td.items.quantityReturned}</th>
                    <th style={thStyle}>{td.items.quantityLost}</th>
                    <th style={thStyle}>{td.items.quantityDamaged}</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((it, idx) => {
                    const total = (it.quantityReturned || 0) + (it.quantityLost || 0) + (it.quantityDamaged || 0);
                    const invalid = total > it.quantitySent;
                    return (
                      <tr
                        key={it._id}
                        style={{
                          background: invalid ? '#fce8e6' : undefined,
                          borderBottom: idx < returnItems.length - 1 ? '1px solid #f1f3f4' : 'none',
                        }}
                      >
                        <td style={{ ...tdStyle, borderBottom: 'none' }}>
                          {it.inventoryItem?.name ?? getInventoryName(it.inventoryItem)}
                        </td>
                        <td style={{ ...tdStyle, borderBottom: 'none', fontWeight: 600 }}>{it.quantitySent}</td>
                        <td style={{ ...tdStyle, borderBottom: 'none' }}>
                          <input
                            type="number" min={0} max={it.quantitySent}
                            value={it.quantityReturned}
                            onChange={e => updateReturnItem(it._id, 'quantityReturned', Number(e.target.value))}
                            style={{ ...inputStyle, width: 76, padding: '6px 10px', borderColor: invalid ? '#d93025' : '#dadce0' }}
                          />
                        </td>
                        <td style={{ ...tdStyle, borderBottom: 'none' }}>
                          <input
                            type="number" min={0} max={it.quantitySent}
                            value={it.quantityLost}
                            onChange={e => updateReturnItem(it._id, 'quantityLost', Number(e.target.value))}
                            style={{ ...inputStyle, width: 76, padding: '6px 10px', borderColor: invalid ? '#d93025' : '#dadce0' }}
                          />
                        </td>
                        <td style={{ ...tdStyle, borderBottom: 'none' }}>
                          <input
                            type="number" min={0} max={it.quantitySent}
                            value={it.quantityDamaged}
                            onChange={e => updateReturnItem(it._id, 'quantityDamaged', Number(e.target.value))}
                            style={{ ...inputStyle, width: 76, padding: '6px 10px', borderColor: invalid ? '#d93025' : '#dadce0' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', gap: 8, borderTop: '1px solid #f1f3f4' }}>
              <button onClick={() => setRecordingReturns(false)} style={btnSecondaryStyle}>{td.cancel}</button>
              <button
                onClick={saveReturns}
                disabled={saving}
                style={{ ...btnPrimaryStyle, background: saving ? '#9aa0a6' : '#1a73e8', cursor: saving ? 'default' : 'pointer' }}
              >
                {saving ? td.saving : td.actions.saveReturns}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form actions — bottom */}
      {(isNew || editing) && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 10,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '14px 16px', marginTop: 4,
          background: '#fff', borderRadius: 12,
          boxShadow: '0 -1px 2px rgba(60,64,67,.15), 0 1px 3px 1px rgba(60,64,67,.15)',
        }}>
          {!isNew && (
            <button onClick={() => setEditing(false)} style={btnSecondaryStyle}>{td.cancel}</button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...btnPrimaryStyle, background: saving ? '#9aa0a6' : '#1a73e8', cursor: saving ? 'default' : 'pointer' }}
          >
            {saving ? td.saving : td.save}
          </button>
        </div>
      )}

      {/* Status advance actions */}
      {!isNew && canManage && !editing && !recordingReturns && status !== 'completed' && (
        <div style={{ ...cardStyle, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              {status === 'draft' && (
                <>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: '#202124' }}>{td.actions.markSent}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#5f6368' }}>Send this batch to the laundry service</p>
                </>
              )}
              {status === 'sent' && (
                <>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: '#202124' }}>{td.actions.recordReturns}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#5f6368' }}>Record quantities returned, lost, or damaged</p>
                </>
              )}
              {status === 'returned' && (
                <>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: '#202124' }}>{td.actions.complete}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#5f6368' }}>Finalize batch and process inventory adjustments</p>
                </>
              )}
            </div>
            <div>
              {status === 'draft' && (
                <button
                  onClick={markSent}
                  disabled={saving}
                  style={{ ...btnPrimaryStyle, cursor: saving ? 'default' : 'pointer', background: saving ? '#9aa0a6' : '#1a73e8' }}
                >
                  {saving ? td.saving : td.actions.markSent}
                </button>
              )}
              {status === 'sent' && (
                <button onClick={startRecordReturns} style={btnPrimaryStyle}>
                  {td.actions.recordReturns}
                </button>
              )}
              {status === 'returned' && (
                <button onClick={() => setCompleteDialog(true)} style={{ ...btnPrimaryStyle, background: '#137333' }}>
                  {td.actions.complete}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inventory impact */}
      {!isNew && (status === 'returned' || status === 'completed') && (
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {td.impactSection}
            </h2>
          </div>
          <div style={{ padding: 20 }}>
            {writeOffCount === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#5f6368' }}>{td.impact.noImpact}</p>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{td.impact.item}</th>
                      <th style={thStyle}>{td.impact.writeOff}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {writeOffItems.map((it: any, idx: number) => (
                      <tr key={it._id} style={{ borderBottom: idx < writeOffItems.length - 1 ? '1px solid #f1f3f4' : 'none' }}>
                        <td style={{ ...tdStyle, borderBottom: 'none' }}>{it.inventoryItem?.name ?? '—'}</td>
                        <td style={{ ...tdStyle, borderBottom: 'none', fontWeight: 700, color: '#d93025' }}>
                          −{(it.quantityLost || 0) + (it.quantityDamaged || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {status === 'completed' && (
                  <p style={{ margin: 0, fontSize: 12, color: '#5f6368' }}>{td.impact.processedNote}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Complete confirmation */}
      {completeDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 8px 32px rgba(60,64,67,.25)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif' }}>
              {td.actions.completeDialogTitle}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', lineHeight: 1.6 }}>
              {td.actions.completeDialogBody(writeOffCount)}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setCompleteDialog(false)} style={btnSecondaryStyle}>
                {td.actions.completeDialogCancel}
              </button>
              <button
                onClick={completeBatch}
                disabled={saving}
                style={{ ...btnPrimaryStyle, background: saving ? '#9aa0a6' : '#137333', cursor: saving ? 'default' : 'pointer' }}
              >
                {saving ? td.actions.completing : td.actions.completeDialogConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(60,64,67,.25)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif' }}>
              {td.deleteDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', lineHeight: 1.6 }}>
              {td.deleteDialog.body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteDialog(false)} style={btnSecondaryStyle}>
                {td.deleteDialog.cancel}
              </button>
              <button
                onClick={handleDelete}
                style={{ ...btnPrimaryStyle, background: '#d93025' }}
              >
                {td.deleteDialog.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#202124', color: '#fff', padding: '12px 20px', borderRadius: 8,
          fontSize: 14, fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        }}>
          {toast}
        </div>
      )}
    </main>
  );
}

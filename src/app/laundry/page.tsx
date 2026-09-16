'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const LaundryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.17 16.83a4 4 0 0 0 5.66 0 4 4 0 0 0 0-5.66l-5.66 5.66zM18 2.01 6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM10 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm5 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
  </svg>
);

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f1f3f4', color: '#5f6368' },
  sent:      { bg: '#e8f0fe', color: '#1a73e8' },
  returned:  { bg: '#fef7e0', color: '#b06000' },
  completed: { bg: '#e6f4ea', color: '#137333' },
};

const STATS_ACCENT: Record<string, string> = {
  total:     '#1a73e8',
  sent:      '#1a73e8',
  returned:  '#b06000',
  completed: '#137333',
};

const STATUS_FILTERS = ['', 'draft', 'sent', 'returned', 'completed'] as const;

export default function LaundryPage() {
  const t = useT();
  const router = useRouter();
  const tl = t.laundryPage;

  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [user, setUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    setLoading(true);
    fetch(`/api/laundry/batches?${params}`)
      .then(r => r.ok ? r.json() : { batches: [] })
      .then((d: any) => { setBatches(d.batches ?? []); setLoading(false); });
  }, [search, filterStatus]);

  const canManage = user?.permissions?.manage_laundry;

  const stats = {
    total:     batches.length,
    sent:      batches.filter(b => b.status === 'sent').length,
    returned:  batches.filter(b => b.status === 'returned').length,
    completed: batches.filter(b => b.status === 'completed').length,
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/laundry/batches/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      setBatches(prev => prev.filter(b => b._id !== deleteId));
      showToast(tl.deleted);
    } else {
      showToast(tl.deleteFailed);
    }
    setDeleteId(null);
  }

  function formatDate(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px, 5vw, 32px) clamp(12px, 4vw, 24px)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: '#e8f0fe', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#1a73e8', flexShrink: 0,
          }}>
            <LaundryIcon />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, Roboto, sans-serif' }}>
            {tl.title}
          </h1>
        </div>
        {canManage && (
          <button
            onClick={() => router.push('/laundry/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1a73e8', color: '#fff', border: 'none',
              borderRadius: 24, padding: '10px 20px', fontSize: 14,
              fontWeight: 500, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(60,64,67,.3)',
              fontFamily: 'Roboto, sans-serif',
            }}
          >
            <PlusIcon />
            {tl.newBatch}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 28 }}>
        {(['total', 'sent', 'returned', 'completed'] as const).map(key => (
          <div key={key} style={{
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
            borderLeft: `4px solid ${STATS_ACCENT[key]}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: STATS_ACCENT[key], fontFamily: 'Google Sans, sans-serif', lineHeight: 1 }}>
              {stats[key]}
            </div>
            <div style={{ fontSize: 11, color: '#5f6368', marginTop: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tl.stats[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6', pointerEvents: 'none', display: 'flex' }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder={tl.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px 9px 40px',
              border: '1px solid #dadce0', borderRadius: 24,
              fontSize: 14, color: '#202124', background: '#fff',
              outline: 'none', fontFamily: 'Roboto, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(s => {
            const active = filterStatus === s;
            const label = s === '' ? tl.filterStatus : tl.status[s as keyof typeof tl.status];
            const cfg = s ? STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '7px 14px', borderRadius: 24, fontSize: 13,
                  border: active ? '1.5px solid transparent' : '1px solid #dadce0',
                  background: active ? (cfg?.bg ?? '#e8f0fe') : '#fff',
                  color: active ? (cfg?.color ?? '#1a73e8') : '#5f6368',
                  cursor: 'pointer', fontWeight: active ? 600 : 400,
                  fontFamily: 'Roboto, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
          overflow: 'hidden',
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              padding: '16px 20px', borderBottom: '1px solid #f1f3f4',
              display: 'flex', gap: 20, alignItems: 'center',
            }}>
              <div style={{ height: 13, width: 90, borderRadius: 4, background: '#f1f3f4' }} />
              <div style={{ height: 13, flex: 1, borderRadius: 4, background: '#f1f3f4' }} />
              <div style={{ height: 13, flex: 2, borderRadius: 4, background: '#f1f3f4' }} />
              <div style={{ height: 22, width: 64, borderRadius: 10, background: '#f1f3f4' }} />
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '60px 24px',
          boxShadow: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#f1f3f4',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, color: '#9aa0a6',
          }}>
            <LaundryIcon />
          </div>
          <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 15, color: '#202124' }}>{tl.empty.title}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#5f6368' }}>{tl.empty.body}</p>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {batches.map(batch => {
            const cfg = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.draft;
            return (
              <div
                key={batch._id}
                onClick={() => router.push(`/laundry/${batch._id}`)}
                style={{
                  background: '#fff', borderRadius: 12, padding: '14px 16px',
                  boxShadow: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 600, color: '#202124', fontFamily: 'monospace', fontSize: 14 }}>
                    {batch.batchNumber}
                  </span>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                    fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color,
                  }}>
                    {tl.status[batch.status as keyof typeof tl.status] ?? batch.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: batch.order?.clientName ? '#202124' : '#9aa0a6' }}>
                  {batch.order?.clientName ?? tl.table.noOrder}
                </div>
                {batch.cleaningSupplier?.name && (
                  <div style={{ fontSize: 12, color: '#5f6368' }}>
                    {tl.table.supplier}: {batch.cleaningSupplier.name}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#5f6368' }}>{formatDate(batch.date)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: '#5f6368' }}>
                      {batch.items?.length ?? 0} {tl.table.items.toLowerCase()}
                    </span>
                    {canManage && batch.status === 'draft' && (
                      <button
                        title={tl.deleteDialog.delete}
                        onClick={e => { e.stopPropagation(); setDeleteId(batch._id); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 6, borderRadius: 6, color: '#d93025',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 12,
          boxShadow: '0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {[tl.table.batchNumber, tl.table.date, tl.table.order, tl.table.supplier, tl.table.items, tl.table.status].map((h, i) => (
                  <th
                    key={i}
                    className={i === 2 || i === 3 ? 'hidden sm:table-cell' : undefined}
                    style={{
                      padding: '11px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, color: '#5f6368', textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: '1px solid #e8eaed',
                      ...(i === 0 ? { paddingLeft: 20 } : {}),
                    }}
                  >
                    {h}
                  </th>
                ))}
                {canManage && <th style={{ padding: '11px 12px', borderBottom: '1px solid #e8eaed', width: 48 }} />}
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, idx) => {
                const cfg = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.draft;
                return (
                  <tr
                    key={batch._id}
                    onClick={() => router.push(`/laundry/${batch._id}`)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: idx < batches.length - 1 ? '1px solid #f1f3f4' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '14px 16px 14px 20px', fontWeight: 600, color: '#202124', fontFamily: 'monospace', fontSize: 13 }}>
                      {batch.batchNumber}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#5f6368' }}>{formatDate(batch.date)}</td>
                    <td className="hidden sm:table-cell" style={{ padding: '14px 16px', color: batch.order?.clientName ? '#202124' : '#9aa0a6' }}>
                      {batch.order?.clientName ?? tl.table.noOrder}
                    </td>
                    <td className="hidden sm:table-cell" style={{ padding: '14px 16px', color: batch.cleaningSupplier?.name ? '#202124' : '#9aa0a6' }}>
                      {batch.cleaningSupplier?.name ?? tl.table.noSupplier}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 26, height: 26, borderRadius: 13,
                        background: '#f1f3f4', fontSize: 12, fontWeight: 600, color: '#5f6368',
                      }}>
                        {batch.items?.length ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                        fontSize: 12, fontWeight: 600,
                        background: cfg.bg, color: cfg.color,
                      }}>
                        {tl.status[batch.status as keyof typeof tl.status] ?? batch.status}
                      </span>
                    </td>
                    {canManage && (
                      <td style={{ padding: '14px 12px' }} onClick={e => e.stopPropagation()}>
                        {batch.status === 'draft' && (
                          <button
                            title={tl.deleteDialog.delete}
                            onClick={() => setDeleteId(batch._id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 6, borderRadius: 6, color: '#bdc1c6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#d93025')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#bdc1c6')}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(60,64,67,.25)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 600, color: '#202124', fontFamily: 'Google Sans, sans-serif' }}>
              {tl.deleteDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', lineHeight: 1.6 }}>
              {tl.deleteDialog.body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ padding: '9px 18px', borderRadius: 24, border: '1px solid #dadce0', background: '#fff', color: '#5f6368', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {tl.deleteDialog.cancel}
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: '9px 18px', borderRadius: 24, border: 'none', background: '#d93025', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {tl.deleteDialog.delete}
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

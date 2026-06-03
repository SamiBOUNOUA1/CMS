'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

interface OrderStatus {
  _id: string;
  label: string;
  name: string;
  color: string;
  triggerEvent?: boolean;
  isSystem?: boolean;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function OrderStatusesSettingsPage() {
  const t = useT();
  const ts = t.orderStatusesSettings;

  const [statuses, setStatuses] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#5f6368');
  const [adding, setAdding] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/order-statuses');
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch {
      showNotification(ts.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/settings/order-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor }),
      });
      if (!res.ok) throw new Error();
      setNewLabel('');
      setNewColor('#5f6368');
      showNotification(ts.notifications.added);
      await load();
    } catch {
      showNotification(ts.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleSetTrigger = async (status: OrderStatus) => {
    try {
      const res = await fetch(`/api/settings/order-statuses/${status._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerEvent: true }),
      });
      if (!res.ok) throw new Error();
      showNotification(ts.notifications.updated);
      await load();
    } catch {
      showNotification(ts.notifications.saveFailed, 'error');
    }
  };

  const handleDelete = async (status: OrderStatus) => {
    if (!confirm(ts.deleteConfirm(status.label))) return;
    try {
      const res = await fetch(`/api/settings/order-statuses/${status._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showNotification(ts.notifications.deleted);
      await load();
    } catch {
      showNotification(ts.notifications.saveFailed, 'error');
    }
  };

  return (
    <div className="max-w-[700px]">
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000, fontFamily: "'Google Sans', Arial", boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
          {notification.msg}
        </div>
      )}

      <div className="mb-7">
        <h1 className="text-[22px] font-normal text-[#202124] m-0" style={{ fontFamily: "'Google Sans'" }}>{ts.title}</h1>
        <p className="text-sm text-[#5f6368] mt-1.5 mb-0">{ts.subtitle}</p>
      </div>

      {/* Add new status */}
      <div className="bg-white rounded-xl border border-[#e8eaed] mb-6 shadow-google-1" style={{ padding: '20px 24px' }}>
        <h2 className="text-[15px] font-medium text-[#202124] m-0 mb-4" style={{ fontFamily: "'Google Sans'" }}>{ts.addNew}</h2>
        <div className="flex gap-2.5 items-end flex-wrap">
          <div style={{ flex: '1 1 200px' }}>
            <label className={labelCls}>{ts.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={ts.labelPlaceholder}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className={inputCls}
            />
          </div>
          <div style={{ flex: '0 0 80px' }}>
            <label className={labelCls}>{ts.color}</label>
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className={inputCls}
              style={{ padding: '4px 6px', height: 38, cursor: 'pointer' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            className="inline-flex items-center justify-center bg-google-blue text-white border-none rounded-full py-[9px] px-5 text-sm font-medium cursor-pointer flex-shrink-0 self-end"
            style={{ fontFamily: "'Google Sans'", opacity: adding || !newLabel.trim() ? 0.6 : 1 }}
          >
            {adding ? ts.adding : ts.add}
          </button>
        </div>
      </div>

      {/* Statuses list */}
      <div className="bg-white rounded-xl border border-[#e8eaed] shadow-google-1 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center bg-[#f8f9fa] font-semibold text-[11px] text-[#5f6368] uppercase tracking-[0.06em] border-b border-[#e8eaed]" style={{ padding: '14px 20px', gap: 12 }}>
          <div style={{ flex: 2 }}>{ts.table.label}</div>
          <div style={{ flex: 1, textAlign: 'center' }}>{ts.table.color}</div>
          <div style={{ flex: 2, textAlign: 'center' }}>{ts.table.trigger}</div>
          <div style={{ flex: 1, textAlign: 'center' }}>{ts.table.system}</div>
          <div style={{ flex: 1, textAlign: 'right' }}>{ts.table.actions}</div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[#5f6368] text-sm">{ts.loading}</div>
        ) : statuses.length === 0 ? (
          <div className="p-10 text-center text-[#5f6368] text-sm">{ts.empty}</div>
        ) : (
          statuses.map((status, i) => (
            <div key={status._id} className="flex items-center" style={{ padding: '14px 20px', gap: 12, borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
              <div style={{ flex: 2 }} className="flex items-center gap-2.5">
                {/* Dynamic color dot — keep inline */}
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ background: status.color }} />
                <span className="font-medium text-sm text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>{status.label}</span>
                <span className="text-[11px] text-[#9aa0a6]" style={{ fontFamily: 'monospace' }}>{status.name}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {/* Dynamic color swatch — keep inline */}
                <span className="inline-block w-5 h-5 rounded" style={{ background: status.color, border: '1px solid rgba(0,0,0,0.1)' }} />
              </div>
              <div style={{ flex: 2, textAlign: 'center' }}>
                {status.triggerEvent ? (
                  <span className="bg-[#e6f4ea] text-[#137333] rounded-full py-1 px-3 text-xs font-semibold" style={{ fontFamily: "'Google Sans'" }}>
                    ✓ {ts.triggerEvent}
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetTrigger(status)}
                    className="text-xs text-google-blue border border-[#dadce0] rounded-full py-1 px-3 bg-white cursor-pointer"
                    style={{ fontFamily: "'Google Sans'" }}
                  >
                    Set as trigger
                  </button>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {status.isSystem ? (
                  <span className="text-xs text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>System</span>
                ) : (
                  <span className="text-xs text-[#5f6368]">—</span>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                {!status.isSystem && (
                  <button
                    onClick={() => handleDelete(status)}
                    className="border-none bg-transparent cursor-pointer text-google-red p-1.5 rounded-full"
                    title={ts.delete}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {statuses.some(s => s.isSystem) && (
        <p className="text-xs text-[#9aa0a6] mt-3 mb-0">{ts.systemNote}</p>
      )}
    </div>
  );
}

const inputCls = 'w-full py-2 px-3 border border-[#dadce0] rounded-lg text-sm outline-none text-[#202124] bg-white box-border';
const labelCls = 'text-xs font-medium text-[#5f6368] block mb-[5px]';

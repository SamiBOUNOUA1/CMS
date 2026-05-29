'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

export default function OrderStatusesSettingsPage() {
  const t = useT();
  const ts = t.orderStatusesSettings;

  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#5f6368');
  const [adding, setAdding] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
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

  const handleSetTrigger = async (status) => {
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

  const handleDelete = async (status) => {
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
    <div style={{ maxWidth: 700 }}>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '12px 24px', borderRadius: 8, zIndex: 1000,
          fontSize: 14, fontFamily: "'Google Sans', Arial", boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        }}>
          {notification.msg}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 400, color: '#202124', margin: 0 }}>{ts.title}</h1>
        <p style={{ fontSize: 14, color: '#5f6368', margin: '6px 0 0' }}>{ts.subtitle}</p>
      </div>

      {/* Add new status */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: '20px 24px', marginBottom: 24, boxShadow: '0 1px 2px rgba(60,64,67,.06)' }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124', margin: '0 0 16px' }}>{ts.addNew}</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>{ts.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={ts.labelPlaceholder}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '0 0 80px' }}>
            <label style={labelStyle}>{ts.color}</label>
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              style={{ ...inputStyle, padding: '4px 6px', height: 38, cursor: 'pointer' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            style={{ ...btnFilled, opacity: adding || !newLabel.trim() ? 0.6 : 1, flexShrink: 0, alignSelf: 'flex-end' }}
          >
            {adding ? ts.adding : ts.add}
          </button>
        </div>
      </div>

      {/* Statuses list */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', boxShadow: '0 1px 2px rgba(60,64,67,.06)', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ ...tableRow, background: '#f8f9fa', fontWeight: 600, fontSize: 11, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ flex: 2 }}>{ts.table.label}</div>
          <div style={{ flex: 1, textAlign: 'center' }}>{ts.table.color}</div>
          <div style={{ flex: 2, textAlign: 'center' }}>{ts.table.trigger}</div>
          <div style={{ flex: 1, textAlign: 'center' }}>{ts.table.system}</div>
          <div style={{ flex: 1, textAlign: 'right' }}>{ts.table.actions}</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#5f6368', fontSize: 14 }}>{ts.loading}</div>
        ) : statuses.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#5f6368', fontSize: 14 }}>{ts.empty}</div>
        ) : (
          statuses.map((status, i) => (
            <div key={status._id} style={{ ...tableRow, borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 14, color: '#202124' }}>{status.label}</span>
                <span style={{ fontSize: 11, color: '#9aa0a6', fontFamily: 'monospace' }}>{status.name}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4, background: status.color, border: '1px solid rgba(0,0,0,0.1)' }} />
              </div>
              <div style={{ flex: 2, textAlign: 'center' }}>
                {status.triggerEvent ? (
                  <span style={{ background: '#e6f4ea', color: '#137333', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 600 }}>
                    ✓ {ts.triggerEvent}
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetTrigger(status)}
                    style={{ fontSize: 12, color: '#1a73e8', border: '1px solid #dadce0', borderRadius: 20, padding: '4px 12px', background: '#fff', cursor: 'pointer', fontFamily: "'Google Sans'" }}
                  >
                    Set as trigger
                  </button>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                {status.isSystem ? (
                  <span style={{ fontSize: 12, color: '#9aa0a6', fontFamily: "'Google Sans'" }}>System</span>
                ) : (
                  <span style={{ fontSize: 12, color: '#5f6368' }}>—</span>
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                {!status.isSystem && (
                  <button
                    onClick={() => handleDelete(status)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d93025', padding: 6, borderRadius: '50%' }}
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
        <p style={{ fontSize: 12, color: '#9aa0a6', margin: '12px 0 0' }}>{ts.systemNote}</p>
      )}
    </div>
  );
}

const tableRow = { display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 };

const inputStyle = {
  width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8,
  fontSize: 14, outline: 'none', fontFamily: 'Roboto, Arial', color: '#202124',
  background: '#fff', boxSizing: 'border-box',
};

const labelStyle = { fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 5, fontFamily: "'Google Sans'" };

const btnFilled = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 24, padding: '9px 20px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
};

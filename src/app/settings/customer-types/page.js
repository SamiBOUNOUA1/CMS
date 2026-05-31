'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

export default function CustomerTypesSettingsPage() {
  const t = useT();
  const tc = t.customerTypesSettings;

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [edits, setEdits] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/customer-types');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch {
      showNotification(tc.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/settings/customer-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setNewLabel('');
      showNotification(tc.notifications.added);
      await load();
    } catch (err) {
      showNotification(err.message || tc.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(cfg) {
    try {
      await fetch(`/api/settings/customer-types/${cfg._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cfg.isActive }),
      });
      setConfigs(cs => cs.map(c => c._id === cfg._id ? { ...c, isActive: !c.isActive } : c));
    } catch {
      showNotification(tc.notifications.saveFailed, 'error');
    }
  }

  function startEdit(cfg) {
    setEdits(e => ({ ...e, [cfg._id]: { label: cfg.label } }));
  }

  function cancelEdit(id) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function handleSaveEdit(id) {
    const label = edits[id]?.label?.trim();
    if (!label) return;
    try {
      const res = await fetch(`/api/settings/customer-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error();
      cancelEdit(id);
      showNotification(tc.notifications.updated);
      await load();
    } catch {
      showNotification(tc.notifications.saveFailed, 'error');
    }
  }

  async function handleDelete(cfg) {
    if (!window.confirm(tc.deleteConfirm(cfg.label))) return;
    try {
      await fetch(`/api/settings/customer-types/${cfg._id}`, { method: 'DELETE' });
      showNotification(tc.notifications.deleted);
      await load();
    } catch {
      showNotification(tc.notifications.saveFailed, 'error');
    }
  }

  const inputStyle = {
    padding: '9px 14px', border: '1px solid #dadce0', borderRadius: 8,
    fontSize: 14, fontFamily: 'Roboto, Arial', color: '#202124',
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  };
  const btnFilled = {
    background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 8, padding: '9px 18px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
  };
  const btnOutline = {
    background: 'transparent', color: '#5f6368', border: '1px solid #dadce0',
    borderRadius: 8, padding: '7px 16px', fontSize: 13,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
  };
  const btnDanger = { ...btnOutline, color: '#d93025', border: '1px solid #fce8e6' };

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Toast */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#137333',
          color: '#fff', padding: '12px 24px', borderRadius: 8,
          fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
          zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.2)', whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 500, color: '#202124' }}>
          {tc.title}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#5f6368', fontFamily: 'Roboto, Arial' }}>
          {tc.subtitle}
        </p>
      </div>

      {/* Add new */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#5f6368', fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {tc.addNew}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={tc.labelPlaceholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleAdd} disabled={adding || !newLabel.trim()} style={{ ...btnFilled, opacity: adding || !newLabel.trim() ? 0.6 : 1 }}>
            {adding ? tc.adding : tc.add}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', padding: '10px 20px', background: '#f8f9fa', borderBottom: '1px solid #e8eaed', gap: 8 }}>
          {[tc.table.label, tc.table.key, tc.table.status, tc.table.actions].map((h, i) => (
            <div key={i} style={{
              flex: i === 3 ? 'none' : i === 1 ? 0.8 : 1,
              width: i === 3 ? 140 : undefined,
              fontSize: 11, fontWeight: 600, color: '#5f6368',
              fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {h}
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: 32, textAlign: 'center', color: '#9aa0a6', fontFamily: "'Google Sans'" }}>
            {tc.loading}
          </div>
        )}

        {!loading && configs.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#9aa0a6', fontFamily: "'Google Sans'" }}>
            {tc.empty}
          </div>
        )}

        {!loading && configs.map((cfg, idx) => {
          const isEditing = !!edits[cfg._id];
          return (
            <div key={cfg._id} style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 8,
              borderBottom: idx < configs.length - 1 ? '1px solid #f1f3f4' : 'none',
            }}>
              {/* Label */}
              <div style={{ flex: 1 }}>
                {isEditing ? (
                  <input
                    value={edits[cfg._id].label}
                    onChange={e => setEdits(ed => ({ ...ed, [cfg._id]: { ...ed[cfg._id], label: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cfg._id)}
                    style={{ ...inputStyle, width: '100%' }}
                    autoFocus
                  />
                ) : (
                  <span style={{ fontSize: 14, color: '#202124', fontFamily: 'Roboto, Arial', fontWeight: 500 }}>
                    {cfg.label}
                  </span>
                )}
              </div>

              {/* Key */}
              <div style={{ flex: 0.8, fontSize: 12, color: '#9aa0a6', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cfg.key}
              </div>

              {/* Active toggle */}
              <div style={{ flex: 1 }}>
                <button
                  onClick={() => handleToggleActive(cfg)}
                  style={{
                    padding: '3px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, fontFamily: "'Google Sans'",
                    background: cfg.isActive ? '#e6f4ea' : '#f1f3f4',
                    color: cfg.isActive ? '#137333' : '#5f6368',
                  }}
                >
                  {cfg.isActive ? tc.active : tc.inactive}
                </button>
              </div>

              {/* Actions */}
              <div style={{ width: 140, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                {isEditing ? (
                  <>
                    <button onClick={() => handleSaveEdit(cfg._id)} style={{ ...btnFilled, padding: '6px 14px', fontSize: 13 }}>{tc.save}</button>
                    <button onClick={() => cancelEdit(cfg._id)} style={{ ...btnOutline, padding: '6px 14px', fontSize: 13 }}>{tc.cancel}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(cfg)} style={btnOutline}>{tc.edit}</button>
                    <button onClick={() => handleDelete(cfg)} style={btnDanger}>{tc.delete}</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <p style={{ marginTop: 12, fontSize: 13, color: '#9aa0a6', fontFamily: 'Roboto, Arial' }}>
        {tc.hint}
      </p>
    </div>
  );
}

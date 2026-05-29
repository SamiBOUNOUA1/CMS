'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

export default function EventTypesSettingsPage() {
  const t = useT();
  const te = t.eventTypesSettings;

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // New event type form
  const [newLabel, setNewLabel] = useState('');
  const [newCountMode, setNewCountMode] = useState('persons');
  const [newTableCapacity, setNewTableCapacity] = useState(10);
  const [adding, setAdding] = useState(false);

  // Inline editing state: { [id]: { label, countMode, tableCapacity } }
  const [edits, setEdits] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/event-type-configs');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch {
      showNotification(te.notifications.loadFailed, 'error');
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
      const res = await fetch('/api/event-type-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), countMode: newCountMode, tableCapacity: Number(newTableCapacity) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setNewLabel('');
      setNewCountMode('persons');
      setNewTableCapacity(10);
      showNotification(te.notifications.added);
      await load();
    } catch (err) {
      showNotification(err.message || te.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(cfg) {
    try {
      await fetch(`/api/event-type-configs/${cfg._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cfg.isActive }),
      });
      setConfigs(cs => cs.map(c => c._id === cfg._id ? { ...c, isActive: !c.isActive } : c));
    } catch {
      showNotification(te.notifications.saveFailed, 'error');
    }
  }

  async function handleDelete(cfg) {
    if (!window.confirm(te.deleteConfirm(cfg.label))) return;
    try {
      await fetch(`/api/event-type-configs/${cfg._id}`, { method: 'DELETE' });
      setConfigs(cs => cs.filter(c => c._id !== cfg._id));
      showNotification(te.notifications.deleted);
    } catch {
      showNotification(te.notifications.saveFailed, 'error');
    }
  }

  function startEdit(cfg) {
    setEdits(e => ({
      ...e,
      [cfg._id]: { label: cfg.label, countMode: cfg.countMode, tableCapacity: cfg.tableCapacity },
    }));
  }

  function cancelEdit(id) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function saveEdit(cfg) {
    const edit = edits[cfg._id];
    if (!edit) return;
    try {
      const res = await fetch(`/api/event-type-configs/${cfg._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: edit.label.trim(),
          countMode: edit.countMode,
          tableCapacity: Number(edit.tableCapacity),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      cancelEdit(cfg._id);
      showNotification(te.notifications.updated);
      await load();
    } catch (err) {
      showNotification(err.message || te.notifications.saveFailed, 'error');
    }
  }

  const chip = (active) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "'Google Sans'",
    background: active ? '#e6f4ea' : '#f1f3f4',
    color: active ? '#137333' : '#5f6368',
  });

  const countModeChip = (mode) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "'Google Sans'",
    background: mode === 'tables' ? '#e8f0fe' : '#fef7e0',
    color: mode === 'tables' ? '#1a73e8' : '#b06000',
  });

  return (
    <div>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#137333',
          color: '#fff', padding: '12px 24px', borderRadius: 8,
          zIndex: 1000, fontSize: 14, fontFamily: "'Google Sans'", whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500, color: '#202124', margin: '0 0 4px' }}>
          {te.title}
        </h2>
        <p style={{ fontSize: 13, color: '#5f6368', margin: 0 }}>{te.subtitle}</p>
      </div>

      {/* Add new event type */}
      <div style={{
        background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
        padding: '20px 24px', marginBottom: 24,
        boxShadow: '0 1px 2px rgba(60,64,67,.06)',
      }}>
        <p style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124', margin: '0 0 16px' }}>
          {te.addNew}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>{te.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={te.labelPlaceholder}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label style={labelStyle}>{te.countMode}</label>
            <select value={newCountMode} onChange={e => setNewCountMode(e.target.value)} style={selectStyle}>
              <option value="persons">{te.countModes.persons}</option>
              <option value="tables">{te.countModes.tables}</option>
            </select>
          </div>
          {newCountMode === 'tables' && (
            <div>
              <label style={labelStyle}>{te.tableCapacity}</label>
              <input
                type="number" min="1" value={newTableCapacity}
                onChange={e => setNewTableCapacity(e.target.value)}
                style={{ ...inputStyle, width: 80 }}
              />
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            style={{
              background: adding || !newLabel.trim() ? '#9aa0a6' : '#1a73e8',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'",
              fontWeight: 500, cursor: adding || !newLabel.trim() ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? te.adding : te.add}
          </button>
        </div>
      </div>

      {/* Event types list */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(60,64,67,.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>{te.loading}</div>
        ) : configs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>{te.empty}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8eaed', background: '#f8f9fa' }}>
                {[te.table.label, te.table.countMode, te.table.tableCapacity, te.table.status, te.table.actions].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i >= 3 ? 'center' : 'left', fontSize: 12, color: '#5f6368', fontWeight: 500, fontFamily: "'Google Sans'" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map(cfg => {
                const editing = edits[cfg._id];
                return (
                  <tr key={cfg._id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                    {/* Label */}
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {editing ? (
                        <input
                          value={editing.label}
                          onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], label: e.target.value } }))}
                          style={{ ...inputStyle, width: 160 }}
                        />
                      ) : (
                        <span>{cfg.label}</span>
                      )}
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#9aa0a6', fontFamily: 'monospace' }}>({cfg.key})</span>
                    </td>
                    {/* Count mode */}
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <select
                          value={editing.countMode}
                          onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], countMode: e.target.value } }))}
                          style={selectStyle}
                        >
                          <option value="persons">{te.countModes.persons}</option>
                          <option value="tables">{te.countModes.tables}</option>
                        </select>
                      ) : (
                        <span style={countModeChip(cfg.countMode)}>
                          {te.countModes[cfg.countMode]}
                        </span>
                      )}
                    </td>
                    {/* Table capacity */}
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <input
                          type="number" min="1"
                          value={editing.tableCapacity}
                          onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], tableCapacity: e.target.value } }))}
                          disabled={editing.countMode !== 'tables'}
                          style={{ ...inputStyle, width: 80, opacity: editing.countMode !== 'tables' ? 0.4 : 1 }}
                        />
                      ) : (
                        <span style={{ color: cfg.countMode === 'tables' ? '#202124' : '#9aa0a6' }}>
                          {cfg.countMode === 'tables' ? `${cfg.tableCapacity} ${te.personsPerTable}` : '—'}
                        </span>
                      )}
                    </td>
                    {/* Active toggle */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleActive(cfg)}
                        style={{ ...chip(cfg.isActive), cursor: 'pointer', border: 'none' }}
                      >
                        {cfg.isActive ? te.active : te.inactive}
                      </button>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {editing ? (
                        <span style={{ display: 'inline-flex', gap: 8 }}>
                          <button onClick={() => saveEdit(cfg)} style={actionBtn('#137333')}>
                            {te.save}
                          </button>
                          <button onClick={() => cancelEdit(cfg._id)} style={actionBtn('#5f6368')}>
                            {te.cancel}
                          </button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 8 }}>
                          <button onClick={() => startEdit(cfg)} style={actionBtn('#1a73e8')}>
                            {te.edit}
                          </button>
                          <button onClick={() => handleDelete(cfg)} style={actionBtn('#d93025')}>
                            {te.delete}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: '#9aa0a6', fontFamily: "'Google Sans'" }}>
        {te.hint}
      </p>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368',
  marginBottom: 6, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid #dadce0',
  fontSize: 14, color: '#202124', outline: 'none', fontFamily: 'Roboto, Arial', boxSizing: 'border-box',
};

const selectStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid #dadce0',
  fontSize: 14, color: '#202124', outline: 'none', fontFamily: 'Roboto, Arial',
  background: '#fff', cursor: 'pointer',
};

const actionBtn = (color) => ({
  background: 'transparent', border: 'none', color,
  fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', padding: '4px 6px',
});

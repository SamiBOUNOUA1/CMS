'use client';

import { useState, useEffect } from 'react';
import { useT, useCurrency } from '@/lib/LanguageContext';

export default function TravelRegionsSettingsPage() {
  const t = useT();
  const tr = t.travelRegionsSettings;
  const currency = useCurrency();

  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [adding, setAdding] = useState(false);

  const [edits, setEdits] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/travel-regions');
      const data = await res.json();
      setRegions(data.regions || []);
    } catch {
      showNotification(tr.notifications.loadFailed, 'error');
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
      const res = await fetch('/api/travel-regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), travelPrice: Number(newPrice) || 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewLabel('');
      setNewPrice(0);
      showNotification(tr.notifications.added);
      await load();
    } catch (err) {
      showNotification(err.message || tr.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(region) {
    try {
      await fetch(`/api/travel-regions/${region._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !region.isActive }),
      });
      setRegions(rs => rs.map(r => r._id === region._id ? { ...r, isActive: !r.isActive } : r));
    } catch {
      showNotification(tr.notifications.saveFailed, 'error');
    }
  }

  async function handleSetDefault(region) {
    try {
      await fetch(`/api/travel-regions/${region._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      setRegions(rs => rs.map(r => ({ ...r, isDefault: r._id === region._id })));
    } catch {
      showNotification(tr.notifications.saveFailed, 'error');
    }
  }

  async function handleDelete(region) {
    if (!window.confirm(tr.deleteConfirm(region.label))) return;
    try {
      await fetch(`/api/travel-regions/${region._id}`, { method: 'DELETE' });
      setRegions(rs => rs.filter(r => r._id !== region._id));
      showNotification(tr.notifications.deleted);
    } catch {
      showNotification(tr.notifications.saveFailed, 'error');
    }
  }

  function startEdit(region) {
    setEdits(e => ({ ...e, [region._id]: { label: region.label, travelPrice: region.travelPrice } }));
  }

  function cancelEdit(id) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function saveEdit(region) {
    const edit = edits[region._id];
    if (!edit) return;
    try {
      const res = await fetch(`/api/travel-regions/${region._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: edit.label.trim(), travelPrice: Number(edit.travelPrice) || 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      cancelEdit(region._id);
      showNotification(tr.notifications.updated);
      await load();
    } catch (err) {
      showNotification(err.message || tr.notifications.saveFailed, 'error');
    }
  }

  const chip = (active) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 12,
    fontSize: 12, fontWeight: 500, fontFamily: "'Google Sans'",
    background: active ? '#e6f4ea' : '#f1f3f4',
    color: active ? '#137333' : '#5f6368',
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

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500, color: '#202124', margin: '0 0 4px' }}>
          {tr.title}
        </h2>
        <p style={{ fontSize: 13, color: '#5f6368', margin: 0 }}>{tr.subtitle}</p>
      </div>

      {/* Add new region */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px', marginBottom: 24, boxShadow: '0 1px 2px rgba(60,64,67,.06)' }}>
        <p style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124', margin: '0 0 16px' }}>
          {tr.addNew}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>{tr.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={tr.labelPlaceholder}
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label style={labelStyle}>{tr.travelPrice}</label>
            <input
              type="number" min="0" step="0.01"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
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
            {adding ? tr.adding : tr.add}
          </button>
        </div>
      </div>

      {/* Regions list */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(60,64,67,.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>{tr.loading}</div>
        ) : regions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6', fontSize: 14 }}>{tr.empty}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8eaed', background: '#f8f9fa' }}>
                {[tr.table.label, tr.table.travelPrice, tr.table.default, tr.table.status, tr.table.actions].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i >= 2 ? 'center' : 'left', fontSize: 12, color: '#5f6368', fontWeight: 500, fontFamily: "'Google Sans'" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regions.map(region => {
                const editing = edits[region._id];
                return (
                  <tr key={region._id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                    {/* Label */}
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {editing ? (
                        <input
                          value={editing.label}
                          onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], label: e.target.value } }))}
                          style={{ ...inputStyle, width: 180 }}
                        />
                      ) : (
                        <span>{region.label}</span>
                      )}
                    </td>
                    {/* Travel price */}
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <input
                          type="number" min="0" step="0.01"
                          value={editing.travelPrice}
                          onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], travelPrice: e.target.value } }))}
                          style={{ ...inputStyle, width: 120 }}
                        />
                      ) : (
                        <span style={{ color: region.travelPrice > 0 ? '#202124' : '#9aa0a6' }}>
                          {region.travelPrice > 0
                            ? `${Number(region.travelPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                            : tr.included}
                        </span>
                      )}
                    </td>
                    {/* Default */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {region.isDefault ? (
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: '#e8f0fe', color: '#1a73e8', fontFamily: "'Google Sans'" }}>
                          {tr.isDefault}
                        </span>
                      ) : (
                        <button onClick={() => handleSetDefault(region)} style={actionBtn('#5f6368')}>
                          {tr.setDefault}
                        </button>
                      )}
                    </td>
                    {/* Active toggle */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button onClick={() => handleToggleActive(region)} style={{ ...chip(region.isActive), cursor: 'pointer', border: 'none' }}>
                        {region.isActive ? tr.active : tr.inactive}
                      </button>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {editing ? (
                        <span style={{ display: 'inline-flex', gap: 8 }}>
                          <button onClick={() => saveEdit(region)} style={actionBtn('#137333')}>{tr.save}</button>
                          <button onClick={() => cancelEdit(region._id)} style={actionBtn('#5f6368')}>{tr.cancel}</button>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 8 }}>
                          <button onClick={() => startEdit(region)} style={actionBtn('#1a73e8')}>{tr.edit}</button>
                          <button onClick={() => handleDelete(region)} style={actionBtn('#d93025')}>{tr.delete}</button>
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
        {tr.hint}
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

const actionBtn = (color) => ({
  background: 'transparent', border: 'none', color,
  fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', padding: '4px 6px',
});

'use client';

import { useState, useEffect } from 'react';
import { useT, useCurrency } from '@/lib/LanguageContext';

interface TravelRegion {
  _id: string;
  label: string;
  travelPrice: number;
  isActive: boolean;
  isDefault?: boolean;
}

interface EditState {
  label: string;
  travelPrice: number | string;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function TravelRegionsSettingsPage() {
  const t = useT();
  const tr = t.travelRegionsSettings;
  const currency = useCurrency();

  const [regions, setRegions] = useState<TravelRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState<number | string>(0);
  const [adding, setAdding] = useState(false);

  const [edits, setEdits] = useState<Record<string, EditState>>({});

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

  function showNotification(msg: string, type: 'success' | 'error' = 'success') {
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
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tr.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(region: TravelRegion) {
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

  async function handleSetDefault(region: TravelRegion) {
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

  async function handleDelete(region: TravelRegion) {
    if (!window.confirm(tr.deleteConfirm(region.label))) return;
    try {
      await fetch(`/api/travel-regions/${region._id}`, { method: 'DELETE' });
      setRegions(rs => rs.filter(r => r._id !== region._id));
      showNotification(tr.notifications.deleted);
    } catch {
      showNotification(tr.notifications.saveFailed, 'error');
    }
  }

  function startEdit(region: TravelRegion) {
    setEdits(e => ({ ...e, [region._id]: { label: region.label, travelPrice: region.travelPrice } }));
  }

  function cancelEdit(id: string) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function saveEdit(region: TravelRegion) {
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
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tr.notifications.saveFailed, 'error');
    }
  }

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333', zIndex: 1000, fontFamily: "'Google Sans'" }}>
          {notification.msg}
        </div>
      )}

      <div className="mb-7">
        <h2 className="text-xl font-medium text-[#202124] m-0 mb-1" style={{ fontFamily: "'Google Sans'" }}>
          {tr.title}
        </h2>
        <p className="text-[13px] text-[#5f6368] m-0">{tr.subtitle}</p>
      </div>

      {/* Add new region */}
      <div className="bg-white border border-[#e8eaed] rounded-xl mb-6 shadow-google-1" style={{ padding: '20px 24px' }}>
        <p className="text-sm font-medium text-[#202124] m-0 mb-4" style={{ fontFamily: "'Google Sans'" }}>
          {tr.addNew}
        </p>
        <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '1fr 160px auto' }}>
          <div>
            <label className={labelCls}>{tr.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={tr.labelPlaceholder}
              className={inputCls}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className={labelCls}>{tr.travelPrice}</label>
            <input
              type="number" min="0" step="0.01"
              value={newPrice as string}
              onChange={e => setNewPrice(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            className="text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium whitespace-nowrap"
            style={{
              fontFamily: "'Google Sans'",
              background: adding || !newLabel.trim() ? '#9aa0a6' : '#1a73e8',
              cursor: adding || !newLabel.trim() ? 'default' : 'pointer',
            }}
          >
            {adding ? tr.adding : tr.add}
          </button>
        </div>
      </div>

      {/* Regions list */}
      <div className="bg-white border border-[#e8eaed] rounded-xl overflow-hidden shadow-google-1">
        {loading ? (
          <div className="p-10 text-center text-[#9aa0a6] text-sm">{tr.loading}</div>
        ) : regions.length === 0 ? (
          <div className="p-10 text-center text-[#9aa0a6] text-sm">{tr.empty}</div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-[#e8eaed] bg-[#f8f9fa]">
                {[tr.table.label, tr.table.travelPrice, tr.table.default, tr.table.status, tr.table.actions].map((h, i) => (
                  <th key={h} className="py-2.5 px-4 text-xs text-[#5f6368] font-medium"
                    style={{ textAlign: i >= 2 ? 'center' : 'left', fontFamily: "'Google Sans'" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regions.map(region => {
                const editing = edits[region._id];
                return (
                  <tr key={region._id} className="border-b border-[#f1f3f4]">
                    {/* Label */}
                    <td className="py-3 px-4 font-medium">
                      {editing ? (
                        <input
                          value={editing.label}
                          onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], label: e.target.value } }))}
                          className={inputCls}
                          style={{ width: 180 }}
                        />
                      ) : (
                        <span>{region.label}</span>
                      )}
                    </td>
                    {/* Travel price */}
                    <td className="py-3 px-4">
                      {editing ? (
                        <input
                          type="number" min="0" step="0.01"
                          value={editing.travelPrice as string}
                          onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], travelPrice: e.target.value } }))}
                          className={inputCls}
                          style={{ width: 120 }}
                        />
                      ) : (
                        /* Dynamic color based on price value — keep inline */
                        <span style={{ color: region.travelPrice > 0 ? '#202124' : '#9aa0a6' }}>
                          {region.travelPrice > 0
                            ? `${Number(region.travelPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                            : tr.included}
                        </span>
                      )}
                    </td>
                    {/* Default */}
                    <td className="py-3 px-4 text-center">
                      {region.isDefault ? (
                        <span className="inline-block py-[2px] px-2.5 rounded-xl text-xs font-semibold bg-[#e8f0fe] text-google-blue" style={{ fontFamily: "'Google Sans'" }}>
                          {tr.isDefault}
                        </span>
                      ) : (
                        <button onClick={() => handleSetDefault(region)}
                          className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#5f6368', fontFamily: "'Google Sans'" }}>
                          {tr.setDefault}
                        </button>
                      )}
                    </td>
                    {/* Active toggle */}
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggleActive(region)}
                        className="inline-block py-[2px] px-2.5 rounded-xl text-xs font-medium cursor-pointer border-none"
                        style={{
                          fontFamily: "'Google Sans'",
                          background: region.isActive ? '#e6f4ea' : '#f1f3f4',
                          color: region.isActive ? '#137333' : '#5f6368',
                        }}>
                        {region.isActive ? tr.active : tr.inactive}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {editing ? (
                        <span className="inline-flex gap-2">
                          <button onClick={() => saveEdit(region)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#137333', fontFamily: "'Google Sans'" }}>{tr.save}</button>
                          <button onClick={() => cancelEdit(region._id)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#5f6368', fontFamily: "'Google Sans'" }}>{tr.cancel}</button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-2">
                          <button onClick={() => startEdit(region)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#1a73e8', fontFamily: "'Google Sans'" }}>{tr.edit}</button>
                          <button onClick={() => handleDelete(region)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#d93025', fontFamily: "'Google Sans'" }}>{tr.delete}</button>
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

      <p className="mt-3 text-xs text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>
        {tr.hint}
      </p>
    </div>
  );
}

const labelCls = 'block text-[11px] font-medium text-[#5f6368] mb-1.5 uppercase tracking-[0.04em]';
const inputCls = 'py-[9px] px-3 rounded-lg border border-[#dadce0] text-sm text-[#202124] outline-none box-border';

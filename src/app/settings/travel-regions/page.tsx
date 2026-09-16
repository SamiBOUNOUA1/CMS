'use client';

import { useState, useEffect } from 'react';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, FormInput, FormCard, Field } from '@/app/components/FormPrimitives';

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

  const priceDisplay = (price: number) =>
    price > 0
      ? `${Number(price).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
      : tr.included;

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap shadow-google-2 z-[1000]"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}>
          {notification.msg}
        </div>
      )}

      <div className="mb-7">
        <h2 className="text-xl font-medium text-g-text m-0 mb-1">{tr.title}</h2>
        <p className="text-[13px] text-g-text-2 m-0">{tr.subtitle}</p>
      </div>

      {/* Add new region */}
      <FormCard className="mb-6">
        <p className="text-[11px] font-semibold text-g-text-2 uppercase tracking-wider m-0 mb-4">{tr.addNew}</p>
        <div className="flex flex-col sm:grid gap-3 sm:items-end" style={{ gridTemplateColumns: '1fr 160px auto' }}>
          <Field label={tr.label}>
            <FormInput
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={tr.labelPlaceholder}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </Field>
          <Field label={tr.travelPrice}>
            <FormInput
              type="number" min="0" step="0.01"
              value={newPrice as string}
              onChange={e => setNewPrice(e.target.value)}
            />
          </Field>
          <button onClick={handleAdd} disabled={adding || !newLabel.trim()} className={`${btnFilled} sm:self-end sm:mb-0`}>
            {adding ? tr.adding : tr.add}
          </button>
        </div>
      </FormCard>

      {/* Regions list */}
      <div className="bg-g-surface border border-g-border rounded-2xl overflow-hidden shadow-google-1">
        {loading ? (
          <div className="p-10 text-center text-[#9aa0a6] text-sm">{tr.loading}</div>
        ) : regions.length === 0 ? (
          <div className="p-10 text-center text-[#9aa0a6] text-sm">{tr.empty}</div>
        ) : (
          <>
            {/* Desktop table — hidden on small screens */}
            <table className="hidden sm:table w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-g-border bg-g-bg">
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
                      <td className="py-3 px-4 font-medium">
                        {editing ? (
                          <FormInput
                            value={editing.label}
                            onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], label: e.target.value } }))}
                            className="w-[180px]"
                          />
                        ) : (
                          <span className="text-g-text">{region.label}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editing ? (
                          <FormInput
                            type="number" min="0" step="0.01"
                            value={editing.travelPrice as string}
                            onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], travelPrice: e.target.value } }))}
                            className="w-[120px]"
                          />
                        ) : (
                          <span style={{ color: region.travelPrice > 0 ? '#202124' : '#9aa0a6' }}>
                            {priceDisplay(region.travelPrice)}
                          </span>
                        )}
                      </td>
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

            {/* Mobile cards — shown only on small screens */}
            <div className="sm:hidden divide-y divide-[#f1f3f4]">
              {regions.map(region => {
                const editing = edits[region._id];
                return (
                  <div key={region._id} className="p-4">
                    {editing ? (
                      /* Edit mode card */
                      <div className="flex flex-col gap-3">
                        <Field label={tr.label}>
                          <FormInput value={editing.label} onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], label: e.target.value } }))} />
                        </Field>
                        <Field label={tr.travelPrice}>
                          <FormInput type="number" min="0" step="0.01" value={editing.travelPrice as string} onChange={e => setEdits(es => ({ ...es, [region._id]: { ...es[region._id], travelPrice: e.target.value } }))} />
                        </Field>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveEdit(region)} className={`${btnFilled} flex-1 justify-center`} style={{ background: '#137333' }}>{tr.save}</button>
                          <button onClick={() => cancelEdit(region._id)} className={`${btnOutline} flex-1 justify-center`}>{tr.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      /* View mode card */
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-sm font-medium text-g-text m-0">{region.label}</p>
                            <p className="text-sm m-0 mt-0.5" style={{ color: region.travelPrice > 0 ? 'var(--google-text-primary)' : 'var(--google-text-hint)' }}>
                              {priceDisplay(region.travelPrice)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {region.isDefault && (
                              <span className="inline-block py-0.5 px-2.5 rounded-xl text-xs font-semibold bg-[#e8f0fe] text-google-blue">
                                {tr.isDefault}
                              </span>
                            )}
                            <button onClick={() => handleToggleActive(region)}
                              className="inline-block py-0.5 px-2.5 rounded-xl text-xs font-medium cursor-pointer border-none"
                              style={{ background: region.isActive ? '#e6f4ea' : '#f1f3f4', color: region.isActive ? '#137333' : '#5f6368' }}>
                              {region.isActive ? tr.active : tr.inactive}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(region)} className={`${btnOutline} flex-1 justify-center`}>{tr.edit}</button>
                          {!region.isDefault && (
                            <button onClick={() => handleSetDefault(region)} className={`${btnOutline} flex-1 justify-center`}>{tr.setDefault}</button>
                          )}
                          <button onClick={() => handleDelete(region)}
                            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[#dadce0] bg-white"
                            style={{ color: '#d93025', fontFamily: "'Google Sans'", cursor: 'pointer' }}>
                            {tr.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-g-text-3">{tr.hint}</p>
    </div>
  );
}

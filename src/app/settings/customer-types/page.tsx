'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, FormInput, FormCard } from '@/app/components/FormPrimitives';

interface CustomerTypeConfig {
  _id: string;
  label: string;
  key: string;
  isActive: boolean;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function CustomerTypesSettingsPage() {
  const t = useT();
  const tc = t.customerTypesSettings;

  const [configs, setConfigs] = useState<CustomerTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [edits, setEdits] = useState<Record<string, { label: string }>>({});

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

  function showNotification(msg: string, type: 'success' | 'error' = 'success') {
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
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tc.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(cfg: CustomerTypeConfig) {
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

  function startEdit(cfg: CustomerTypeConfig) {
    setEdits(e => ({ ...e, [cfg._id]: { label: cfg.label } }));
  }

  function cancelEdit(id: string) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function handleSaveEdit(id: string) {
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

  async function handleDelete(cfg: CustomerTypeConfig) {
    if (!window.confirm(tc.deleteConfirm(cfg.label))) return;
    try {
      await fetch(`/api/settings/customer-types/${cfg._id}`, { method: 'DELETE' });
      showNotification(tc.notifications.deleted);
      await load();
    } catch {
      showNotification(tc.notifications.saveFailed, 'error');
    }
  }

  return (
    <div className="max-w-[700px]">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium whitespace-nowrap shadow-google-2 z-[200]"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}>
          {notification.msg}
        </div>
      )}

      <div className="mb-7">
        <h1 className="m-0 text-[22px] font-medium text-g-text">{tc.title}</h1>
        <p className="mt-1.5 mb-0 text-sm text-g-text-2">{tc.subtitle}</p>
      </div>

      {/* Add new */}
      <FormCard className="mb-6">
        <p className="m-0 mb-3 text-[11px] font-semibold text-g-text-2 uppercase tracking-wider">{tc.addNew}</p>
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <FormInput
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={tc.labelPlaceholder}
            className="flex-1"
          />
          <button onClick={handleAdd} disabled={adding || !newLabel.trim()} className={`${btnFilled} sm:w-auto w-full justify-center`}>
            {adding ? tc.adding : tc.add}
          </button>
        </div>
      </FormCard>

      {/* Table */}
      <div className="bg-g-surface border border-g-border rounded-2xl overflow-hidden shadow-google-1">
        <div className="hidden sm:flex bg-g-bg border-b border-g-border gap-2 px-5 py-2.5">
          {[tc.table.label, tc.table.key, tc.table.status, tc.table.actions].map((h, i) => (
            <div key={i}
              className="text-[11px] font-semibold text-g-text-2 uppercase tracking-wider"
              style={{ flex: i === 3 ? 'none' : i === 1 ? 0.8 : 1, width: i === 3 ? 140 : undefined }}>
              {h}
            </div>
          ))}
        </div>

        {loading && <div className="p-8 text-center text-g-text-3">{tc.loading}</div>}
        {!loading && configs.length === 0 && <div className="p-8 text-center text-g-text-3">{tc.empty}</div>}

        {!loading && configs.map((cfg, idx) => {
          const isEditing = !!edits[cfg._id];
          return (
            <div key={cfg._id} style={{ borderBottom: idx < configs.length - 1 ? '1px solid var(--google-border)' : 'none' }}>

              {/* Desktop row */}
              <div className="hidden sm:flex items-center gap-2 px-5 py-3">
                <div className="flex-1">
                  {isEditing ? (
                    <FormInput
                      value={edits[cfg._id].label}
                      onChange={e => setEdits(ed => ({ ...ed, [cfg._id]: { ...ed[cfg._id], label: e.target.value } }))}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cfg._id)}
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-g-text font-medium">{cfg.label}</span>
                  )}
                </div>
                <div className="text-xs text-g-text-3 overflow-hidden text-ellipsis font-mono" style={{ flex: 0.8 }}>
                  {cfg.key}
                </div>
                <div className="flex-1">
                  <button onClick={() => handleToggleActive(cfg)}
                    className="py-0.5 px-3 rounded-xl border-none cursor-pointer text-xs font-medium"
                    style={{ background: cfg.isActive ? '#e6f4ea' : '#f1f3f4', color: cfg.isActive ? '#137333' : '#5f6368' }}>
                    {cfg.isActive ? tc.active : tc.inactive}
                  </button>
                </div>
                <div className="flex justify-end gap-1.5 w-[140px]">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSaveEdit(cfg._id)} className="bg-google-blue text-white border-none rounded-full py-1.5 px-3.5 text-[13px] font-medium cursor-pointer">{tc.save}</button>
                      <button onClick={() => cancelEdit(cfg._id)} className={btnOutline + ' !py-1.5 !px-3.5'}>{tc.cancel}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(cfg)} className={btnOutline + ' !py-1.5 !px-3.5'}>{tc.edit}</button>
                      <button onClick={() => handleDelete(cfg)} className="bg-transparent text-google-red border border-google-red/30 rounded-full py-1.5 px-3.5 text-[13px] font-medium cursor-pointer">{tc.delete}</button>
                    </>
                  )}
                </div>
              </div>

              {/* Mobile card */}
              <div className="flex sm:hidden flex-col gap-2.5 px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <FormInput
                        value={edits[cfg._id].label}
                        onChange={e => setEdits(ed => ({ ...ed, [cfg._id]: { ...ed[cfg._id], label: e.target.value } }))}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cfg._id)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-g-text font-medium block">{cfg.label}</span>
                    )}
                    <span className="text-[11px] text-g-text-3 mt-0.5 block font-mono">{cfg.key}</span>
                  </div>
                  <button onClick={() => handleToggleActive(cfg)}
                    className="shrink-0 py-0.5 px-3 rounded-xl border-none cursor-pointer text-xs font-medium"
                    style={{ background: cfg.isActive ? '#e6f4ea' : '#f1f3f4', color: cfg.isActive ? '#137333' : '#5f6368' }}>
                    {cfg.isActive ? tc.active : tc.inactive}
                  </button>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSaveEdit(cfg._id)} className="flex-1 bg-google-blue text-white border-none rounded-full py-2 px-3 text-[13px] font-medium cursor-pointer">{tc.save}</button>
                      <button onClick={() => cancelEdit(cfg._id)} className="flex-1 bg-transparent text-g-text-2 border border-g-border rounded-full py-2 px-3 text-[13px] font-medium cursor-pointer">{tc.cancel}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(cfg)} className="flex-1 bg-transparent text-g-text-2 border border-g-border rounded-full py-2 px-3 text-[13px] font-medium cursor-pointer">{tc.edit}</button>
                      <button onClick={() => handleDelete(cfg)} className="flex-1 bg-transparent text-google-red border border-google-red/30 rounded-full py-2 px-3 text-[13px] font-medium cursor-pointer">{tc.delete}</button>
                    </>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[13px] text-g-text-3">{tc.hint}</p>
    </div>
  );
}

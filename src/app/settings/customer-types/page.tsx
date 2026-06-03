'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333', fontFamily: "'Google Sans'", zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.2)' }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-7">
        <h1 className="m-0 text-[22px] font-medium text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>
          {tc.title}
        </h1>
        <p className="mt-1.5 mb-0 text-sm text-[#5f6368]">
          {tc.subtitle}
        </p>
      </div>

      {/* Add new */}
      <div className="bg-white border border-[#e8eaed] rounded-xl mb-6" style={{ padding: '20px 24px' }}>
        <p className="m-0 mb-3 text-[13px] font-semibold text-[#5f6368] uppercase tracking-[0.05em]" style={{ fontFamily: "'Google Sans'" }}>
          {tc.addNew}
        </p>
        <div className="flex gap-2.5 items-center">
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={tc.labelPlaceholder}
            className="flex-1 py-[9px] px-3.5 border border-[#dadce0] rounded-lg text-sm text-[#202124] outline-none bg-white box-border"
          />
          <button onClick={handleAdd} disabled={adding || !newLabel.trim()}
            className="bg-google-blue text-white border-none rounded-lg py-[9px] px-[18px] text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ fontFamily: "'Google Sans'", opacity: adding || !newLabel.trim() ? 0.6 : 1 }}>
            {adding ? tc.adding : tc.add}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e8eaed] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex bg-[#f8f9fa] border-b border-[#e8eaed] gap-2" style={{ padding: '10px 20px' }}>
          {[tc.table.label, tc.table.key, tc.table.status, tc.table.actions].map((h, i) => (
            <div key={i}
              className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-[0.04em]"
              style={{ flex: i === 3 ? 'none' : i === 1 ? 0.8 : 1, width: i === 3 ? 140 : undefined, fontFamily: "'Google Sans'" }}>
              {h}
            </div>
          ))}
        </div>

        {loading && (
          <div className="p-8 text-center text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>
            {tc.loading}
          </div>
        )}

        {!loading && configs.length === 0 && (
          <div className="p-8 text-center text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>
            {tc.empty}
          </div>
        )}

        {!loading && configs.map((cfg, idx) => {
          const isEditing = !!edits[cfg._id];
          return (
            <div key={cfg._id}
              className="flex items-center gap-2"
              style={{ padding: '12px 20px', borderBottom: idx < configs.length - 1 ? '1px solid #f1f3f4' : 'none' }}>
              {/* Label */}
              <div className="flex-1">
                {isEditing ? (
                  <input
                    value={edits[cfg._id].label}
                    onChange={e => setEdits(ed => ({ ...ed, [cfg._id]: { ...ed[cfg._id], label: e.target.value } }))}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cfg._id)}
                    className="w-full py-[9px] px-3.5 border border-[#dadce0] rounded-lg text-sm text-[#202124] outline-none bg-white box-border"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm text-[#202124] font-medium">
                    {cfg.label}
                  </span>
                )}
              </div>

              {/* Key */}
              <div className="text-xs text-[#9aa0a6] overflow-hidden text-ellipsis" style={{ flex: 0.8, fontFamily: 'monospace' }}>
                {cfg.key}
              </div>

              {/* Active toggle */}
              <div className="flex-1">
                <button
                  onClick={() => handleToggleActive(cfg)}
                  className="py-[3px] px-3 rounded-xl border-none cursor-pointer text-xs font-medium"
                  style={{
                    fontFamily: "'Google Sans'",
                    background: cfg.isActive ? '#e6f4ea' : '#f1f3f4',
                    color: cfg.isActive ? '#137333' : '#5f6368',
                  }}
                >
                  {cfg.isActive ? tc.active : tc.inactive}
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-1.5" style={{ width: 140 }}>
                {isEditing ? (
                  <>
                    <button onClick={() => handleSaveEdit(cfg._id)}
                      className="bg-google-blue text-white border-none rounded-lg py-1.5 px-3.5 text-[13px] font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}>{tc.save}</button>
                    <button onClick={() => cancelEdit(cfg._id)}
                      className="bg-transparent text-[#5f6368] border border-[#dadce0] rounded-lg py-1.5 px-3.5 text-[13px] font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}>{tc.cancel}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(cfg)}
                      className="bg-transparent text-[#5f6368] border border-[#dadce0] rounded-lg py-[7px] px-4 text-[13px] font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}>{tc.edit}</button>
                    <button onClick={() => handleDelete(cfg)}
                      className="bg-transparent text-google-red border border-[#fce8e6] rounded-lg py-[7px] px-4 text-[13px] font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}>{tc.delete}</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <p className="mt-3 text-[13px] text-[#9aa0a6]">
        {tc.hint}
      </p>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

interface EventTypeConfig {
  _id: string;
  key: string;
  label: string;
  countMode: 'persons' | 'tables';
  tableCapacity: number;
  isActive: boolean;
}

interface EditState {
  label: string;
  countMode: string;
  tableCapacity: number | string;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function EventTypesSettingsPage() {
  const t = useT();
  const te = t.eventTypesSettings;

  const [configs, setConfigs] = useState<EventTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [newCountMode, setNewCountMode] = useState('persons');
  const [newTableCapacity, setNewTableCapacity] = useState<number | string>(10);
  const [adding, setAdding] = useState(false);

  const [edits, setEdits] = useState<Record<string, EditState>>({});

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

  function showNotification(msg: string, type: 'success' | 'error' = 'success') {
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
        body: JSON.stringify({ label: newLabel.trim(), countMode: newCountMode, tableCapacity: Number(newTableCapacity) })
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
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : te.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(cfg: EventTypeConfig) {
    try {
      await fetch(`/api/event-type-configs/${cfg._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cfg.isActive })
      });
      setConfigs(cs => cs.map(c => c._id === cfg._id ? { ...c, isActive: !c.isActive } : c));
    } catch {
      showNotification(te.notifications.saveFailed, 'error');
    }
  }

  async function handleDelete(cfg: EventTypeConfig) {
    if (!window.confirm(te.deleteConfirm(cfg.label))) return;
    try {
      await fetch(`/api/event-type-configs/${cfg._id}`, { method: 'DELETE' });
      setConfigs(cs => cs.filter(c => c._id !== cfg._id));
      showNotification(te.notifications.deleted);
    } catch {
      showNotification(te.notifications.saveFailed, 'error');
    }
  }

  function startEdit(cfg: EventTypeConfig) {
    setEdits(e => ({
      ...e,
      [cfg._id]: { label: cfg.label, countMode: cfg.countMode, tableCapacity: cfg.tableCapacity }
    }));
  }

  function cancelEdit(id: string) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function saveEdit(cfg: EventTypeConfig) {
    const edit = edits[cfg._id];
    if (!edit) return;
    try {
      const res = await fetch(`/api/event-type-configs/${cfg._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: edit.label.trim(),
          countMode: edit.countMode,
          tableCapacity: Number(edit.tableCapacity)
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      cancelEdit(cfg._id);
      showNotification(te.notifications.updated);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : te.notifications.saveFailed, 'error');
    }
  }

  return (
    <div>
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm text-center max-w-[90vw]"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333', zIndex: 1000}}
        >
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-7">
        <h2 className="text-xl font-medium text-g-text m-0 mb-1">
          {te.title}
        </h2>
        <p className="text-[13px] text-g-text-2 m-0">{te.subtitle}</p>
      </div>

      {/* Add new event type */}
      <div className="bg-g-surface border border-g-border rounded-2xl shadow-google-1 mb-6 p-4 sm:p-6">
        <p className="text-sm font-medium text-g-text m-0 mb-4">
          {te.addNew}
        </p>
        <div className="flex flex-col gap-3 sm:grid sm:items-end" style={{ gridTemplateColumns: '1fr auto auto auto' } as React.CSSProperties}>
          <div>
            <label className={labelCls}>{te.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={te.labelPlaceholder}
              className={`${inputCls} w-full`}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className={labelCls}>{te.countMode}</label>
            <select value={newCountMode} onChange={e => setNewCountMode(e.target.value)} className={`${selectCls} w-full sm:w-auto`}>
              <option value="persons">{te.countModes.persons}</option>
              <option value="tables">{te.countModes.tables}</option>
            </select>
          </div>
          {newCountMode === 'tables' && (
            <div>
              <label className={labelCls}>{te.tableCapacity}</label>
              <input
                type="number" min="1" value={newTableCapacity}
                onChange={e => setNewTableCapacity(e.target.value)}
                className={inputCls}
                style={{ width: 80 }}
              />
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            className="text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium w-full sm:w-auto"
            style={{
                            background: adding || !newLabel.trim() ? '#9aa0a6' : '#1a73e8',
              cursor: adding || !newLabel.trim() ? 'default' : 'pointer'
            }}
          >
            {adding ? te.adding : te.add}
          </button>
        </div>
      </div>

      {/* Event types list */}
      <div className="bg-g-surface border border-g-border rounded-2xl shadow-google-1 overflow-hidden shadow-google-1">
        {loading ? (
          <div className="p-10 text-center text-g-text-3 text-sm">{te.loading}</div>
        ) : configs.length === 0 ? (
          <div className="p-10 text-center text-g-text-3 text-sm">{te.empty}</div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-g-border">
              {configs.map(cfg => {
                const editing = edits[cfg._id];
                return (
                  <div key={cfg._id} className="p-4">
                    {editing ? (
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className={labelCls}>{te.label}</label>
                          <input
                            value={editing.label}
                            onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], label: e.target.value } }))}
                            className={`${inputCls} w-full`}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>{te.countMode}</label>
                          <select
                            value={editing.countMode}
                            onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], countMode: e.target.value } }))}
                            className={`${selectCls} w-full`}
                          >
                            <option value="persons">{te.countModes.persons}</option>
                            <option value="tables">{te.countModes.tables}</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>{te.tableCapacity}</label>
                          <input
                            type="number" min="1"
                            value={editing.tableCapacity as string}
                            onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], tableCapacity: e.target.value } }))}
                            disabled={editing.countMode !== 'tables'}
                            className={inputCls}
                            style={{ width: 80, opacity: editing.countMode !== 'tables' ? 0.4 : 1 }}
                          />
                        </div>
                        <div className="flex gap-3 pt-1">
                          <button onClick={() => saveEdit(cfg)} className="bg-transparent border-none text-sm font-medium cursor-pointer py-1 px-0" style={{ color: '#137333'}}>
                            {te.save}
                          </button>
                          <button onClick={() => cancelEdit(cfg._id)} className="bg-transparent border-none text-sm font-medium cursor-pointer py-1 px-0" style={{ color: '#5f6368'}}>
                            {te.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <span className="font-medium text-g-text text-sm">{cfg.label}</span>
                            <span className="ml-2 text-[11px] text-g-text-3" style={{ fontFamily: 'monospace' }}>({cfg.key})</span>
                          </div>
                          <button
                            onClick={() => handleToggleActive(cfg)}
                            className="flex-shrink-0 inline-block py-[2px] px-2.5 rounded-xl text-xs font-medium cursor-pointer border-none"
                            style={{
                                                            background: cfg.isActive ? '#e6f4ea' : '#f1f3f4',
                              color: cfg.isActive ? '#137333' : '#5f6368'
                            }}
                          >
                            {cfg.isActive ? te.active : te.inactive}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-block py-[2px] px-2.5 rounded-xl text-xs font-medium" style={{
                                                        background: cfg.countMode === 'tables' ? '#e8f0fe' : '#fef7e0',
                            color: cfg.countMode === 'tables' ? '#1a73e8' : '#b06000'
                          }}>
                            {te.countModes[cfg.countMode]}
                          </span>
                          {cfg.countMode === 'tables' && (
                            <span className="text-xs text-g-text-2">{cfg.tableCapacity} {te.personsPerTable}</span>
                          )}
                        </div>
                        <div className="flex gap-4">
                          <button onClick={() => startEdit(cfg)} className="bg-transparent border-none text-sm font-medium cursor-pointer py-0 px-0" style={{ color: '#1a73e8'}}>
                            {te.edit}
                          </button>
                          <button onClick={() => handleDelete(cfg)} className="bg-transparent border-none text-sm font-medium cursor-pointer py-0 px-0" style={{ color: '#d93025'}}>
                            {te.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-g-border bg-g-bg">
                    {[te.table.label, te.table.countMode, te.table.tableCapacity, te.table.status, te.table.actions].map((h, i) => (
                      <th key={h} className="py-2.5 px-4 text-xs text-g-text-2 font-medium"
                        style={{ textAlign: i >= 3 ? 'center' : 'left'}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configs.map(cfg => {
                    const editing = edits[cfg._id];
                    return (
                      <tr key={cfg._id} className="border-b border-g-border">
                        {/* Label */}
                        <td className="py-3 px-4 font-medium">
                          {editing ? (
                            <input
                              value={editing.label}
                              onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], label: e.target.value } }))}
                              className={inputCls}
                              style={{ width: 160 }}
                            />
                          ) : (
                            <span>{cfg.label}</span>
                          )}
                          <span className="ml-2 text-[11px] text-g-text-3" style={{ fontFamily: 'monospace' }}>({cfg.key})</span>
                        </td>
                        {/* Count mode */}
                        <td className="py-3 px-4">
                          {editing ? (
                            <select
                              value={editing.countMode}
                              onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], countMode: e.target.value } }))}
                              className={selectCls}
                            >
                              <option value="persons">{te.countModes.persons}</option>
                              <option value="tables">{te.countModes.tables}</option>
                            </select>
                          ) : (
                            <span className="inline-block py-[2px] px-2.5 rounded-xl text-xs font-medium" style={{
                                                            background: cfg.countMode === 'tables' ? '#e8f0fe' : '#fef7e0',
                              color: cfg.countMode === 'tables' ? '#1a73e8' : '#b06000'
                            }}>
                              {te.countModes[cfg.countMode]}
                            </span>
                          )}
                        </td>
                        {/* Table capacity */}
                        <td className="py-3 px-4">
                          {editing ? (
                            <input
                              type="number" min="1"
                              value={editing.tableCapacity as string}
                              onChange={e => setEdits(es => ({ ...es, [cfg._id]: { ...es[cfg._id], tableCapacity: e.target.value } }))}
                              disabled={editing.countMode !== 'tables'}
                              className={inputCls}
                              style={{ width: 80, opacity: editing.countMode !== 'tables' ? 0.4 : 1 }}
                            />
                          ) : (
                            <span style={{ color: cfg.countMode === 'tables' ? '#202124' : '#9aa0a6' }}>
                              {cfg.countMode === 'tables' ? `${cfg.tableCapacity} ${te.personsPerTable}` : '—'}
                            </span>
                          )}
                        </td>
                        {/* Active toggle */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(cfg)}
                            className="inline-block py-[2px] px-2.5 rounded-xl text-xs font-medium cursor-pointer border-none"
                            style={{
                                                            background: cfg.isActive ? '#e6f4ea' : '#f1f3f4',
                              color: cfg.isActive ? '#137333' : '#5f6368'
                            }}
                          >
                            {cfg.isActive ? te.active : te.inactive}
                          </button>
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {editing ? (
                            <span className="inline-flex gap-2">
                              <button onClick={() => saveEdit(cfg)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#137333'}}>
                                {te.save}
                              </button>
                              <button onClick={() => cancelEdit(cfg._id)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#5f6368'}}>
                                {te.cancel}
                              </button>
                            </span>
                          ) : (
                            <span className="inline-flex gap-2">
                              <button onClick={() => startEdit(cfg)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#1a73e8'}}>
                                {te.edit}
                              </button>
                              <button onClick={() => handleDelete(cfg)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#d93025'}}>
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
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-g-text-3">
        {te.hint}
      </p>
    </div>
  );
}

const labelCls = 'block text-[11px] font-medium text-g-text-2 mb-1.5 uppercase tracking-[0.04em]';
const inputCls = 'py-[9px] px-3 rounded-lg border border-g-border text-sm text-g-text outline-none box-border';
const selectCls = 'py-[9px] px-3 rounded-lg border border-g-border text-sm text-g-text outline-none bg-white cursor-pointer';

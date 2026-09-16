'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

interface StaffRole {
  _id: string;
  label: string;
  key: string;
  isActive: boolean;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function StaffRolesSettingsPage() {
  const t = useT();
  const tr = t.staffRolesSettings;

  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const [edits, setEdits] = useState<Record<string, { label: string }>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/staff-roles');
      const data = await res.json();
      setRoles(data.roles || []);
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
      const res = await fetch('/api/settings/staff-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewLabel('');
      showNotification(tr.notifications.added);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tr.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(role: StaffRole) {
    try {
      await fetch(`/api/settings/staff-roles/${role._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !role.isActive })
      });
      setRoles(rs => rs.map(r => r._id === role._id ? { ...r, isActive: !r.isActive } : r));
    } catch {
      showNotification(tr.notifications.saveFailed, 'error');
    }
  }

  async function handleDelete(role: StaffRole) {
    if (!window.confirm(tr.deleteConfirm(role.label))) return;
    try {
      await fetch(`/api/settings/staff-roles/${role._id}`, { method: 'DELETE' });
      setRoles(rs => rs.filter(r => r._id !== role._id));
      showNotification(tr.notifications.deleted);
    } catch {
      showNotification(tr.notifications.saveFailed, 'error');
    }
  }

  function startEdit(role: StaffRole) {
    setEdits(e => ({ ...e, [role._id]: { label: role.label } }));
  }

  function cancelEdit(id: string) {
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
  }

  async function saveEdit(role: StaffRole) {
    const edit = edits[role._id];
    if (!edit || !edit.label.trim()) return;
    try {
      const res = await fetch(`/api/settings/staff-roles/${role._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: edit.label.trim() })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      cancelEdit(role._id);
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
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333', zIndex: 1000}}>
          {notification.msg}
        </div>
      )}

      <div className="mb-7">
        <h2 className="text-xl font-medium text-g-text m-0 mb-1">
          {tr.title}
        </h2>
        <p className="text-[13px] text-g-text-2 m-0">{tr.subtitle}</p>
      </div>

      {/* Add new role */}
      <div className="bg-g-surface border border-g-border rounded-2xl shadow-google-1 mb-6 p-4 sm:p-6">
        <p className="text-sm font-medium text-g-text m-0 mb-4">
          {tr.addNew}
        </p>
        <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '1fr auto' }}>
          <div>
            <label className={labelCls}>{tr.label}</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={tr.labelPlaceholder}
              className={`${inputCls} w-full`}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            className="text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium whitespace-nowrap"
            style={{
                            background: adding || !newLabel.trim() ? '#9aa0a6' : '#1a73e8',
              cursor: adding || !newLabel.trim() ? 'default' : 'pointer'
            }}
          >
            {adding ? tr.adding : tr.add}
          </button>
        </div>
      </div>

      {/* Roles list */}
      <div className="bg-g-surface border border-g-border rounded-2xl shadow-google-1 overflow-hidden shadow-google-1">
        {loading ? (
          <div className="p-10 text-center text-g-text-3 text-sm">{tr.loading}</div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center text-g-text-3 text-sm">{tr.empty}</div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b border-g-border bg-g-bg">
                {[tr.table.label, tr.table.key, tr.table.status, tr.table.actions].map((h, i) => (
                  <th key={h} className="py-2.5 px-4 text-xs text-g-text-2 font-medium"
                    style={{ textAlign: i >= 2 ? 'center' : 'left'}}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map(role => {
                const editing = edits[role._id];
                return (
                  <tr key={role._id} className="border-b border-g-border">
                    {/* Label */}
                    <td className="py-3 px-4 font-medium">
                      {editing ? (
                        <input
                          value={editing.label}
                          onChange={e => setEdits(es => ({ ...es, [role._id]: { label: e.target.value } }))}
                          className={inputCls}
                          style={{ width: 200 }}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(role); if (e.key === 'Escape') cancelEdit(role._id); }}
                          autoFocus
                        />
                      ) : (
                        <span>{role.label}</span>
                      )}
                    </td>
                    {/* Key */}
                    <td className="py-3 px-4">
                      <span className="text-xs text-g-text-2 bg-[#f1f3f4] py-[2px] px-2 rounded" style={{ fontFamily: 'monospace' }}>
                        {role.key}
                      </span>
                    </td>
                    {/* Active toggle */}
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggleActive(role)}
                        className="inline-block py-[2px] px-2.5 rounded-xl text-xs font-medium cursor-pointer border-none"
                        style={{
                                                    background: role.isActive ? '#e6f4ea' : '#f1f3f4',
                          color: role.isActive ? '#137333' : '#5f6368'
                        }}>
                        {role.isActive ? tr.active : tr.inactive}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {editing ? (
                        <span className="inline-flex gap-2">
                          <button onClick={() => saveEdit(role)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#137333'}}>{tr.save}</button>
                          <button onClick={() => cancelEdit(role._id)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#5f6368'}}>{tr.cancel}</button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-2">
                          <button onClick={() => startEdit(role)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#1a73e8'}}>{tr.edit}</button>
                          <button onClick={() => handleDelete(role)} className="bg-transparent border-none text-[13px] font-medium cursor-pointer py-1 px-1.5" style={{ color: '#d93025'}}>{tr.delete}</button>
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

      <p className="mt-3 text-xs text-g-text-3">
        {tr.hint}
      </p>
    </div>
  );
}

const labelCls = 'block text-[11px] font-medium text-g-text-2 mb-1.5 uppercase tracking-[0.04em]';
const inputCls = 'py-[9px] px-3 rounded-lg border border-g-border text-sm text-g-text outline-none box-border';

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useT } from '@/lib/LanguageContext';

interface Role {
  _id: string;
  name: string;
  label: string;
  isSystem?: boolean;
  isDefault?: boolean;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

const SYSTEM_COLORS: Record<string, { bg: string; color: string }> = {
  admin:   { bg: '#fce8e6', color: '#d93025' },
  manager: { bg: '#e8f0fe', color: '#1a73e8' },
  viewer:  { bg: '#f1f3f4', color: '#5f6368' },
};
const FALLBACK_COLOR = { bg: '#f1f3f4', color: '#5f6368' };

function roleColor(name: string) {
  return SYSTEM_COLORS[name] ?? FALLBACK_COLOR;
}

function IconLock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

export default function RolesPage() {
  const t = useT();
  const tr = t.permissions.roles;

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      if (!res.ok) { notify(tr.notifications.loadFailed, 'error'); return; }
      const data = await res.json();
      setRoles(data.roles || []);
    } finally {
      setLoading(false);
    }
  }, [tr.notifications.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), isDefault: newIsDefault }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.error || tr.notifications.saveFailed, 'error'); return; }
      setNewLabel('');
      setNewIsDefault(false);
      setShowAddForm(false);
      notify(tr.notifications.created);
      load();
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (role: Role) => {
    setEditingId(role._id);
    setEditLabel(role.label);
  };

  const saveEdit = async (role: Role) => {
    if (!editLabel.trim()) return;
    setSaving(role._id);
    try {
      const res = await fetch(`/api/admin/roles/${role._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.error || tr.notifications.saveFailed, 'error'); return; }
      setEditingId(null);
      notify(tr.notifications.updated);
      load();
    } finally {
      setSaving(null);
    }
  };

  const toggleDefault = async (role: Role) => {
    setSaving(role._id);
    try {
      const res = await fetch(`/api/admin/roles/${role._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: !role.isDefault }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.error || tr.notifications.saveFailed, 'error'); return; }
      notify(tr.notifications.updated);
      load();
    } finally {
      setSaving(null);
    }
  };

  const deleteRole = async (roleId: string) => {
    setSaving(roleId);
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { notify(data.error || tr.notifications.deleteFailed, 'error'); setDeleteId(null); return; }
      setDeleteId(null);
      notify(tr.notifications.deleted);
      load();
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <p className="text-[#5f6368] text-sm" style={{ fontFamily: "'Google Sans'" }}>Loading…</p>;
  }

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000, fontFamily: "'Google Sans'" }}>
          {notification.msg}
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.4)', zIndex: 200 }}>
          <div className="bg-white rounded-2xl w-full max-w-[360px]" style={{ padding: '24px 28px', boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 className="text-lg font-medium m-0 mb-2.5" style={{ fontFamily: "'Google Sans'" }}>{tr.deleteDialog.title}</h3>
            <p className="text-sm text-[#5f6368] m-0 mb-6">{tr.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)}
                className="bg-transparent text-google-blue border border-[#dadce0] rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer"
                style={{ fontFamily: "'Google Sans'" }}>{tr.deleteDialog.cancel}</button>
              <button onClick={() => deleteRole(deleteId)} disabled={saving === deleteId}
                className="text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer"
                style={{ background: '#d93025', fontFamily: "'Google Sans'" }}>
                {saving === deleteId ? '…' : tr.deleteDialog.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add role button + form */}
      <div className="mb-5">
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)}
            className="bg-google-blue text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer"
            style={{ fontFamily: "'Google Sans'" }}>{tr.addRole}</button>
        ) : (
          <form onSubmit={createRole}
            className="bg-white rounded-xl border border-[#e8eaed] p-5 flex flex-wrap gap-3 items-end shadow-google-1">
            <div style={{ flex: '1 1 200px' }}>
              <label className={labelCls}>{tr.editLabel}</label>
              <input
                required
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder={tr.labelPlaceholder}
                className={inputCls}
                autoFocus
              />
            </div>
            <label className="flex items-center gap-1.5 text-[13px] text-[#5f6368] cursor-pointer flex-shrink-0 pb-0.5" style={{ fontFamily: "'Google Sans'" }}>
              <input type="checkbox" checked={newIsDefault} onChange={e => setNewIsDefault(e.target.checked)} />
              {tr.setAsDefault}
            </label>
            <div className="flex gap-2 flex-shrink-0">
              <button type="submit" disabled={creating}
                className="bg-google-blue text-white border-none rounded-lg py-[9px] px-4 text-[13px] font-medium cursor-pointer"
                style={{ fontFamily: "'Google Sans'" }}>
                {creating ? tr.creating : tr.create}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewLabel(''); }}
                className="bg-transparent text-google-blue border border-[#dadce0] rounded-lg py-[9px] px-4 text-[13px] font-medium cursor-pointer"
                style={{ fontFamily: "'Google Sans'" }}>
                {tr.deleteDialog.cancel}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Roles table */}
      <div className="bg-white rounded-xl border border-[#e8eaed] overflow-hidden shadow-google-1">
        {/* Table header */}
        <div className="flex bg-[#f8f9fa] border-b border-[#e8eaed] gap-2" style={{ padding: '10px 20px' }}>
          <div style={{ flex: 2 }} className="text-[11px] font-medium text-[#5f6368] uppercase tracking-[0.06em]">Role</div>
          <div style={{ flex: 1 }} className="text-[11px] font-medium text-[#5f6368] uppercase tracking-[0.06em]">Internal name</div>
          <div style={{ width: 100 }} className="text-[11px] font-medium text-[#5f6368] uppercase tracking-[0.06em] text-center">Default</div>
          <div style={{ width: 80 }} />
        </div>

        {roles.map((role, i) => {
          const rc = roleColor(role.name);
          const isEditing = editingId === role._id;
          return (
            <div key={role._id} className="flex items-center gap-2 flex-wrap" style={{ padding: '14px 20px', borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>

              {/* Label / edit field */}
              <div style={{ flex: 2 }} className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex gap-1.5 items-center">
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      className={inputCls}
                      style={{ width: 160, padding: '7px 10px' }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(role); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <button onClick={() => saveEdit(role)} disabled={saving === role._id}
                      className="bg-google-blue text-white border-none rounded-lg py-[7px] px-3 text-xs font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}>
                      {saving === role._id ? '…' : '✓'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="bg-transparent text-google-blue border border-[#dadce0] rounded-lg py-[7px] px-3 text-xs font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}>✕</button>
                  </div>
                ) : (
                  <>
                    <span className="rounded-xl py-[3px] px-3 text-[13px] font-medium" style={{ background: rc.bg, color: rc.color, fontFamily: "'Google Sans'" }}>
                      {role.label}
                    </span>
                    {role.isSystem && (
                      <span className="flex items-center gap-[3px] text-[11px] text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>
                        <IconLock />{tr.systemRole}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Internal name */}
              <div style={{ flex: 1, fontFamily: 'monospace' }} className="text-xs text-[#9aa0a6]">{role.name}</div>

              {/* Default toggle */}
              <div style={{ width: 100 }} className="flex justify-center">
                <button
                  onClick={() => toggleDefault(role)}
                  disabled={saving === role._id}
                  className="border-none rounded-xl py-[3px] px-2.5 text-xs font-medium cursor-pointer"
                  style={{
                    fontFamily: "'Google Sans'",
                    background: role.isDefault ? '#e6f4ea' : '#f1f3f4',
                    color: role.isDefault ? '#137333' : '#5f6368',
                  }}
                >
                  {role.isDefault ? 'Yes' : 'No'}
                </button>
              </div>

              {/* Actions */}
              <div style={{ width: 80 }} className="flex justify-end gap-1">
                {!role.isSystem && !isEditing && (
                  <>
                    <button onClick={() => startEdit(role)}
                      className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full border-none bg-transparent text-[#5f6368] cursor-pointer"
                      title={tr.editLabel}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(role._id)}
                      className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full border-none bg-transparent text-google-red cursor-pointer"
                      title={tr.deleteRole}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {roles.length === 0 && (
          <p className="p-5 text-sm text-[#9aa0a6] m-0" style={{ fontFamily: "'Google Sans'" }}>No roles yet.</p>
        )}
      </div>

      <p className="text-xs text-[#9aa0a6] mt-4" style={{ fontFamily: "'Google Sans'" }}>
        System roles are protected and cannot be deleted or renamed.
      </p>
    </div>
  );
}

const labelCls = 'block text-[11px] font-medium text-[#5f6368] mb-[5px] uppercase tracking-[0.04em]';
const inputCls = 'w-full py-[9px] px-3 rounded-lg box-border border border-[#dadce0] text-[13px] text-[#202124] outline-none';

'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Role {
  _id: string;
  name: string;
  label: string;
  isDefault?: boolean;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

const SYSTEM_COLORS: Record<string, { bg: string; color: string }> = {
  admin:   { bg: '#fce8e6', color: '#d93025' },
  manager: { bg: '#e8f0fe', color: '#1a73e8' },
  viewer:  { bg: '#f1f3f4', color: '#5f6368' }
};
const FALLBACK_COLOR = { bg: '#f1f3f4', color: '#5f6368' };

function roleColor(name: string) {
  return SYSTEM_COLORS[name] ?? FALLBACK_COLOR;
}

export default function UsersPage() {
  const t = useT();
  const tu = t.users;
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [form, setForm] = useState<UserForm>({ name: '', email: '', password: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchRoles = async (): Promise<Role[]> => {
    const res = await fetch('/api/admin/roles');
    if (!res.ok) return [];
    const data = await res.json();
    setRoles(data.roles || []);
    return data.roles || [];
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles().then(fetchedRoles => {
      const defaultRole = fetchedRoles?.find(r => r.isDefault)?.name
        ?? fetchedRoles?.find(r => r.name !== 'admin')?.name
        ?? 'viewer';
      setForm(f => ({ ...f, role: defaultRole }));
    });
    fetchUsers();
  }, []);

  const resetForm = (defaultRole?: string) => {
    const role = defaultRole ?? roles.find(r => r.isDefault)?.name ?? roles.find(r => r.name !== 'admin')?.name ?? '';
    setForm({ name: '', email: '', password: '', role });
    setFormError('');
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error); return; }
      setShowForm(false);
      resetForm();
      await fetchUsers();
      notify(tu.notifications.created);
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, patch: Partial<User & { password?: string }>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) { notify(data.error, 'error'); return; }
    setUsers(us => us.map(u => u._id === id ? data.user : u));
    setEditUser(null);
    notify(tu.notifications.updated);
  };

  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { notify(data.error, 'error'); setDeleteId(null); return; }
    setUsers(us => us.filter(u => u._id !== id));
    setDeleteId(null);
    notify(tu.notifications.deleted);
  };

  const roleLabel = (roleName: string) => roles.find(r => r.name === roleName)?.label ?? roleName;

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000}}>
          {notification.msg}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.4)', zIndex: 200 }}>
          <div className="bg-white rounded-2xl w-full max-w-[360px]" style={{ padding: '24px 28px', boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 className="text-lg font-medium m-0 mb-2.5">{tu.deleteDialog.title}</h3>
            <p className="text-sm text-g-text-2 m-0 mb-6">{tu.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)}
                className="bg-transparent text-google-blue border border-g-border rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer"
               >{tu.deleteDialog.cancel}</button>
              <button onClick={() => deleteUser(deleteId)}
                className="text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer"
                style={{ background: '#d93025'}}>{tu.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 z-[200]">
          <div className="bg-g-surface rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] p-5 sm:p-6 shadow-google-3">
            <EditForm user={users.find(u => u._id === editUser)!} roles={roles} onSave={patch => updateUser(editUser, patch)} onCancel={() => setEditUser(null)} tu={tu} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6 gap-3">
        <p className="text-[13px] text-g-text-2 m-0">{tu.userCount(users.length)}</p>
        <button onClick={() => { setShowForm(true); resetForm(); }} className="bg-google-blue text-white border-none rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer flex-shrink-0 shadow-google-1">
          {tu.addUser}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="bg-g-surface rounded-2xl border border-g-border mb-6 shadow-google-1 p-4 sm:p-6">
          <h2 className="text-base font-medium text-g-text m-0 mb-5">{tu.newUser}</h2>
          <form onSubmit={createUser}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              <div>
                <label className={labelCls}>{tu.fullName}</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{tu.email}</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{tu.password}</label>
                <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={tu.passwordPlaceholder} minLength={8} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{tu.role}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                  {roles.map(r => <option key={r._id} value={r.name}>{r.label}</option>)}
                </select>
              </div>
            </div>
            {formError && <p className="text-google-red text-[13px] m-0 mb-3">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="bg-transparent text-google-blue border border-g-border rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer">{tu.cancel}</button>
              <button type="submit" disabled={saving} className="text-white bg-google-blue border-none rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer shadow-google-1 disabled:opacity-60">
                {saving ? tu.creating : tu.createUser}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {roles.map(role => (
          <div key={role._id} className="flex items-center gap-1.5">
            <RoleBadge roleName={role.name} label={role.label} />
          </div>
        ))}
      </div>

      {/* Users list */}
      {loading ? (
        <p className="text-g-text-2 text-sm">{tu.loading}</p>
      ) : (
        <>
        {/* Mobile cards */}
        <div className="flex sm:hidden flex-col gap-2.5">
          {users.map(u => (
            <div key={u._id} className="bg-g-surface rounded-2xl border border-g-border p-4 shadow-google-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-full flex-shrink-0 bg-google-blue text-white flex items-center justify-center font-medium text-base">
                  {u.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-g-text">{u.name}</div>
                  <div className="text-xs text-g-text-2 overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</div>
                </div>
                <RoleBadge roleName={u.role} label={roleLabel(u.role)} />
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => updateUser(u._id, { isActive: !u.isActive })}
                  className="border-none rounded-xl py-[3px] px-2.5 text-xs font-medium cursor-pointer"
                  style={{ background: u.isActive ? '#e6f4ea' : '#f1f3f4', color: u.isActive ? '#137333' : '#5f6368'}}
                >
                  {u.isActive ? tu.active : tu.inactive}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => setEditUser(u._id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent text-g-text-2 cursor-pointer" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                  </button>
                  <button onClick={() => setDeleteId(u._id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent text-google-red cursor-pointer" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block bg-g-surface rounded-2xl border border-g-border overflow-hidden shadow-google-1">
          <div className="flex items-center bg-g-bg border-b border-g-border" style={{ padding: '14px 20px', gap: 12 }}>
            {[tu.table.user, tu.table.email, tu.table.role, tu.table.status, ''].map((h, idx) => (
              <div key={h + idx}
                style={{ flex: idx === 4 ? undefined : idx === 0 ? 3 : idx === 1 ? 2 : 1, width: idx === 4 ? 100 : undefined, textAlign: idx === 4 ? 'right' : 'left' }}
                className="text-[11px] font-medium text-g-text-2 uppercase tracking-[0.06em]">{h}</div>
            ))}
          </div>
          {users.map((u, i) => (
            <div key={u._id} className="flex items-center" style={{ padding: '14px 20px', gap: 12, borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
              {editUser === u._id ? (
                <div className="flex-1">
                  <EditForm user={u} roles={roles} onSave={patch => updateUser(u._id, patch)} onCancel={() => setEditUser(null)} inline tu={tu} />
                </div>
              ) : (
                <>
                  <div style={{ flex: 3 }} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 bg-google-blue text-white flex items-center justify-center font-medium text-sm">
                      {u.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-g-text">{u.name}</span>
                  </div>
                  <div style={{ flex: 2 }} className="text-[13px] text-g-text-2 overflow-hidden text-ellipsis whitespace-nowrap">{u.email}</div>
                  <div style={{ flex: 1 }}><RoleBadge roleName={u.role} label={roleLabel(u.role)} /></div>
                  <div style={{ flex: 1 }}>
                    <button
                      onClick={() => updateUser(u._id, { isActive: !u.isActive })}
                      className="border-none rounded-xl py-[3px] px-2.5 text-xs font-medium cursor-pointer"
                      style={{ background: u.isActive ? '#e6f4ea' : '#f1f3f4', color: u.isActive ? '#137333' : '#5f6368'}}
                    >
                      {u.isActive ? tu.active : tu.inactive}
                    </button>
                  </div>
                  <div style={{ width: 100 }} className="flex justify-end gap-1">
                    <button onClick={() => setEditUser(u._id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent text-g-text-2 cursor-pointer" title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(u._id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent text-google-red cursor-pointer" title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function EditForm({ user, roles, onSave, onCancel, inline, tu }: {
  user: User;
  roles: Role[];
  onSave: (patch: Partial<User & { password?: string }>) => void;
  onCancel: () => void;
  inline?: boolean;
  tu: ReturnType<typeof useT>['users'];
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState('');
  const save = () => {
    const p: Partial<User & { password?: string }> = { name, role };
    if (password) p.password = password;
    onSave(p);
  };

  return (
    <div className="flex flex-wrap gap-2.5 items-end">
      <div style={{ flex: inline ? '1 1 140px' : '1 1 100%' }}>
        {!inline && <label className={labelCls}>{tu.fullName}</label>}
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={tu.namePlaceholder} />
      </div>
      <div style={{ flex: inline ? '0 0 120px' : '1 1 100%' }}>
        {!inline && <label className={labelCls}>{tu.role}</label>}
        <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
          {roles.map(r => <option key={r._id} value={r.name}>{r.label}</option>)}
        </select>
      </div>
      <div style={{ flex: inline ? '1 1 150px' : '1 1 100%' }}>
        {!inline && <label className={labelCls}>{tu.newPassword}</label>}
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder={tu.newPasswordPlaceholder} />
      </div>
      <div className="flex gap-2" style={{ marginTop: inline ? 0 : 4 }}>
        <button onClick={save}
          className="bg-google-blue text-white border-none rounded-lg py-[9px] px-4 text-[13px] font-medium cursor-pointer"
         >{tu.save}</button>
        <button onClick={onCancel}
          className="bg-transparent text-google-blue border border-g-border rounded-lg py-[9px] px-4 text-[13px] font-medium cursor-pointer"
         >{tu.cancel}</button>
      </div>
    </div>
  );
}

function RoleBadge({ roleName, label }: { roleName: string; label: string }) {
  const s = roleColor(roleName);
  return (
    <span className="rounded-xl py-[3px] px-2.5 text-xs font-medium whitespace-nowrap" style={{ background: s.bg, color: s.color}}>
      {label}
    </span>
  );
}

const labelCls = 'block text-[11px] font-medium text-g-text-2 mb-[5px] uppercase tracking-[0.04em]';
const inputCls = 'w-full py-[9px] px-3 rounded-lg box-border border border-g-border text-[13px] text-g-text outline-none';

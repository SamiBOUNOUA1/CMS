'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';

const SYSTEM_COLORS = {
  admin:   { bg: '#fce8e6', color: '#d93025' },
  manager: { bg: '#e8f0fe', color: '#1a73e8' },
  viewer:  { bg: '#f1f3f4', color: '#5f6368' },
};
const FALLBACK_COLOR = { bg: '#f1f3f4', color: '#5f6368' };

function roleColor(name) {
  return SYSTEM_COLORS[name] ?? FALLBACK_COLOR;
}

export default function UsersPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tu = t.users;
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchRoles = async () => {
    const res = await fetch('/api/admin/roles');
    if (!res.ok) return;
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

  const resetForm = (defaultRole) => {
    const role = defaultRole ?? roles.find(r => r.isDefault)?.name ?? roles.find(r => r.name !== 'admin')?.name ?? '';
    setForm({ name: '', email: '', password: '', role });
    setFormError('');
  };

  const createUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const updateUser = async (id, patch) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) { notify(data.error, 'error'); return; }
    setUsers(us => us.map(u => u._id === id ? data.user : u));
    setEditUser(null);
    notify(tu.notifications.updated);
  };

  const deleteUser = async (id) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { notify(data.error, 'error'); setDeleteId(null); return; }
    setUsers(us => us.filter(u => u._id !== id));
    setDeleteId(null);
    notify(tu.notifications.deleted);
  };

  const roleLabel = (roleName) => roles.find(r => r.name === roleName)?.label ?? roleName;

  return (
    <div>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '12px 24px', borderRadius: 8, zIndex: 1000,
          fontSize: 14, fontFamily: "'Google Sans'", whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 360, boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, margin: '0 0 10px' }}>{tu.deleteDialog.title}</h3>
            <p style={{ fontSize: 14, color: '#5f6368', margin: '0 0 24px' }}>{tu.deleteDialog.body}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={btnOutline}>{tu.deleteDialog.cancel}</button>
              <button onClick={() => deleteUser(deleteId)} style={{ ...btnFilled, background: '#d93025' }}>{tu.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — mobile */}
      {editUser && isMobile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px 20px', width: '100%', boxShadow: '0 -4px 20px rgba(0,0,0,.15)' }}>
            <EditForm user={users.find(u => u._id === editUser)} roles={roles} onSave={patch => updateUser(editUser, patch)} onCancel={() => setEditUser(null)} tu={tu} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <p style={{ fontSize: 13, color: '#5f6368', margin: 0 }}>{tu.userCount(users.length)}</p>
        <button onClick={() => { setShowForm(true); resetForm(); }} style={{ ...btnFilled, flexShrink: 0 }}>
          {tu.addUser}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 24, boxShadow: '0 2px 8px rgba(60,64,67,.1)' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, margin: '0 0 20px', color: '#202124' }}>{tu.newUser}</h2>
          <form onSubmit={createUser}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>{tu.fullName}</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{tu.email}</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{tu.password}</label>
                <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={tu.passwordPlaceholder} minLength={8} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{tu.role}</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                  {roles.map(r => <option key={r._id} value={r.name}>{r.label}</option>)}
                </select>
              </div>
            </div>
            {formError && <p style={{ color: '#d93025', fontSize: 13, margin: '0 0 12px' }}>{formError}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={btnOutline}>{tu.cancel}</button>
              <button type="submit" disabled={saving} style={{ ...btnFilled, background: saving ? '#9aa0a6' : '#1a73e8' }}>
                {saving ? tu.creating : tu.createUser}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {roles.map(role => (
          <div key={role._id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RoleBadge roleName={role.name} label={role.label} />
          </div>
        ))}
      </div>

      {/* Users list */}
      {loading ? (
        <p style={{ color: '#5f6368', fontSize: 14 }}>{tu.loading}</p>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: '16px', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 16 }}>
                  {u.name[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 14, color: '#202124' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                </div>
                <RoleBadge roleName={u.role} label={roleLabel(u.role)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => updateUser(u._id, { isActive: !u.isActive })}
                  style={{ border: 'none', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', background: u.isActive ? '#e6f4ea' : '#f1f3f4', color: u.isActive ? '#137333' : '#5f6368' }}
                >
                  {u.isActive ? tu.active : tu.inactive}
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditUser(u._id)} style={iconBtn} title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                  </button>
                  <button onClick={() => setDeleteId(u._id)} style={{ ...iconBtn, color: '#d93025' }} title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
          <div style={{ ...tableRow, background: '#f8f9fa', borderBottom: '1px solid #e8eaed' }}>
            {[tu.table.user, tu.table.email, tu.table.role, tu.table.status, ''].map((h, idx) => (
              <div key={h + idx} style={{ flex: idx === 4 ? undefined : idx === 0 ? 3 : idx === 1 ? 2 : 1, width: idx === 4 ? 100 : undefined, fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: idx === 4 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {users.map((u, i) => (
            <div key={u._id} style={{ ...tableRow, borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
              {editUser === u._id ? (
                <div style={{ flex: 1 }}>
                  <EditForm user={u} roles={roles} onSave={patch => updateUser(u._id, patch)} onCancel={() => setEditUser(null)} inline tu={tu} />
                </div>
              ) : (
                <>
                  <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 14 }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#202124' }}>{u.name}</span>
                  </div>
                  <div style={{ flex: 2, fontSize: 13, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ flex: 1 }}><RoleBadge roleName={u.role} label={roleLabel(u.role)} /></div>
                  <div style={{ flex: 1 }}>
                    <button
                      onClick={() => updateUser(u._id, { isActive: !u.isActive })}
                      style={{ border: 'none', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', background: u.isActive ? '#e6f4ea' : '#f1f3f4', color: u.isActive ? '#137333' : '#5f6368' }}
                    >
                      {u.isActive ? tu.active : tu.inactive}
                    </button>
                  </div>
                  <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button onClick={() => setEditUser(u._id)} style={iconBtn} title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(u._id)} style={{ ...iconBtn, color: '#d93025' }} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditForm({ user, roles, onSave, onCancel, inline, tu }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState('');
  const save = () => { const p = { name, role }; if (password) p.password = password; onSave(p); };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ flex: inline ? '1 1 140px' : '1 1 100%' }}>
        {!inline && <label style={labelStyle}>{tu.fullName}</label>}
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder={tu.namePlaceholder} />
      </div>
      <div style={{ flex: inline ? '0 0 120px' : '1 1 100%' }}>
        {!inline && <label style={labelStyle}>{tu.role}</label>}
        <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
          {roles.map(r => <option key={r._id} value={r.name}>{r.label}</option>)}
        </select>
      </div>
      <div style={{ flex: inline ? '1 1 150px' : '1 1 100%' }}>
        {!inline && <label style={labelStyle}>{tu.newPassword}</label>}
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder={tu.newPasswordPlaceholder} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: inline ? 0 : 4 }}>
        <button onClick={save} style={{ ...btnFilled, padding: '9px 16px', fontSize: 13 }}>{tu.save}</button>
        <button onClick={onCancel} style={{ ...btnOutline, padding: '9px 16px', fontSize: 13 }}>{tu.cancel}</button>
      </div>
    </div>
  );
}

function RoleBadge({ roleName, label }) {
  const s = roleColor(roleName);
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 12, padding: '3px 10px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const tableRow = { display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 12 };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368', marginBottom: 5, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box', border: '1px solid #dadce0', fontSize: 13, color: '#202124', outline: 'none', fontFamily: 'Roboto, Arial' };
const btnFilled = { background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' };
const btnOutline = { background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' };
const iconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', color: '#5f6368', cursor: 'pointer' };

'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
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

  const createRole = async (e) => {
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

  const startEdit = (role) => {
    setEditingId(role._id);
    setEditLabel(role.label);
  };

  const saveEdit = async (role) => {
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

  const toggleDefault = async (role) => {
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

  const deleteRole = async (roleId) => {
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
    return <p style={{ color: '#5f6368', fontFamily: "'Google Sans'", fontSize: 14 }}>{tr.notifications.loadFailed === tr.notifications.loadFailed ? 'Loading…' : ''}</p>;
  }

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

      {/* Delete confirm dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 360, boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, margin: '0 0 10px' }}>{tr.deleteDialog.title}</h3>
            <p style={{ fontSize: 14, color: '#5f6368', margin: '0 0 24px' }}>{tr.deleteDialog.body}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={btnOutline}>{tr.deleteDialog.cancel}</button>
              <button onClick={() => deleteRole(deleteId)} disabled={saving === deleteId} style={{ ...btnFilled, background: '#d93025' }}>
                {saving === deleteId ? '…' : tr.deleteDialog.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add role button + form */}
      <div style={{ marginBottom: 20 }}>
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} style={btnFilled}>{tr.addRole}</button>
        ) : (
          <form onSubmit={createRole} style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e8eaed',
            padding: '20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
            boxShadow: '0 1px 2px rgba(60,64,67,.08)',
          }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={labelStyle}>{tr.editLabel}</label>
              <input
                required
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder={tr.labelPlaceholder}
                style={inputStyle}
                autoFocus
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5f6368', fontFamily: "'Google Sans'", cursor: 'pointer', flexShrink: 0, paddingBottom: 2 }}>
              <input type="checkbox" checked={newIsDefault} onChange={e => setNewIsDefault(e.target.checked)} />
              {tr.setAsDefault}
            </label>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button type="submit" disabled={creating} style={{ ...btnFilled, padding: '9px 16px', fontSize: 13 }}>
                {creating ? tr.creating : tr.create}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewLabel(''); }} style={{ ...btnOutline, padding: '9px 16px', fontSize: 13 }}>
                {tr.deleteDialog.cancel}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Roles table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
        {/* Table header */}
        <div style={{ display: 'flex', background: '#f8f9fa', borderBottom: '1px solid #e8eaed', padding: '10px 20px', gap: 8 }}>
          <div style={{ flex: 2, fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</div>
          <div style={{ flex: 1, fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Internal name</div>
          <div style={{ width: 100, fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Default</div>
          <div style={{ width: 80 }} />
        </div>

        {roles.map((role, i) => {
          const rc = roleColor(role.name);
          const isEditing = editingId === role._id;
          return (
            <div key={role._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderTop: i > 0 ? '1px solid #f1f3f4' : 'none', flexWrap: 'wrap' }}>

              {/* Label / edit field */}
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      style={{ ...inputStyle, width: 160, padding: '7px 10px' }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(role); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <button onClick={() => saveEdit(role)} disabled={saving === role._id} style={{ ...btnFilled, padding: '7px 12px', fontSize: 12 }}>
                      {saving === role._id ? '…' : '✓'}
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ ...btnOutline, padding: '7px 12px', fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <>
                    <span style={{ background: rc.bg, color: rc.color, borderRadius: 12, padding: '3px 12px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                      {role.label}
                    </span>
                    {role.isSystem && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9aa0a6', fontFamily: "'Google Sans'" }}>
                        <IconLock />{tr.systemRole}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Internal name */}
              <div style={{ flex: 1, fontSize: 12, color: '#9aa0a6', fontFamily: 'monospace' }}>{role.name}</div>

              {/* Default toggle */}
              <div style={{ width: 100, display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => toggleDefault(role)}
                  disabled={saving === role._id}
                  style={{
                    border: 'none', borderRadius: 12, padding: '3px 10px', fontSize: 12,
                    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
                    background: role.isDefault ? '#e6f4ea' : '#f1f3f4',
                    color: role.isDefault ? '#137333' : '#5f6368',
                  }}
                >
                  {role.isDefault ? 'Yes' : 'No'}
                </button>
              </div>

              {/* Actions */}
              <div style={{ width: 80, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                {!role.isSystem && !isEditing && (
                  <>
                    <button onClick={() => startEdit(role)} style={iconBtn} title={tr.editLabel}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </button>
                    <button onClick={() => setDeleteId(role._id)} style={{ ...iconBtn, color: '#d93025' }} title={tr.deleteRole}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {roles.length === 0 && (
          <p style={{ padding: '20px', fontSize: 14, color: '#9aa0a6', fontFamily: "'Google Sans'", margin: 0 }}>No roles yet.</p>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#9aa0a6', marginTop: 16, fontFamily: "'Google Sans'" }}>
        System roles are protected and cannot be deleted or renamed.
      </p>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368', marginBottom: 5, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box', border: '1px solid #dadce0', fontSize: 13, color: '#202124', outline: 'none', fontFamily: 'Roboto, Arial' };
const btnFilled = { background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' };
const btnOutline = { background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' };
const iconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent', color: '#5f6368', cursor: 'pointer' };

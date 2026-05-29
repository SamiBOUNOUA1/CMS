'use client';

import { useState, useEffect, useCallback } from 'react';
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

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#dadce0' : checked ? '#1a73e8' : '#dadce0',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

export default function PermissionsPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.permissions;

  const [matrix, setMatrix] = useState(null);
  const [permKeys, setPermKeys] = useState([]);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(null);
  const [notification, setNotification] = useState(null);
  const [dirty, setDirty] = useState({});

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/permissions');
    if (!res.ok) { notify(tp.loadFailed, 'error'); return; }
    const data = await res.json();
    setMatrix(data.matrix);
    setPermKeys(data.permissions);
    setRoles(data.roles ?? []);
    setDirty({});
  }, [tp.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const toggle = (role, perm) => {
    setDirty(d => ({
      ...d,
      [role]: {
        ...(d[role] ?? matrix[role]),
        [perm]: !(d[role]?.[perm] ?? matrix[role][perm]),
      },
    }));
  };

  const getVal = (role, perm) =>
    dirty[role] ? dirty[role][perm] : matrix[role][perm];

  const saveRole = async (role) => {
    setSaving(role);
    const permissions = { ...(matrix[role] ?? {}), ...(dirty[role] ?? {}) };
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions }),
      });
      if (!res.ok) { notify(tp.saveFailed, 'error'); return; }
      await load();
      notify(tp.saved(role));
    } finally {
      setSaving(null);
    }
  };

  const roleNames = matrix ? Object.keys(matrix) : [];

  if (!matrix) {
    return <p style={{ color: '#5f6368', fontFamily: "'Google Sans'", fontSize: 14 }}>{tp.loading}</p>;
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

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {roleNames.map(role => {
            const rc = roleColor(role);
            const roleDoc = roles.find(r => r.name === role);
            const isDirty = !!dirty[role];
            return (
              <div key={role} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: '20px 16px', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ background: rc.bg, color: rc.color, borderRadius: 12, padding: '3px 12px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                    {roleDoc?.label ?? role}
                  </span>
                  {isDirty && (
                    <button
                      onClick={() => saveRole(role)}
                      disabled={saving === role}
                      style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' }}
                    >
                      {saving === role ? tp.saving : tp.save}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {permKeys.map(perm => (
                    <div key={perm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#202124', fontFamily: "'Google Sans'" }}>{tp.permLabels[perm] ?? perm}</span>
                      <Toggle checked={getVal(role, perm)} onChange={() => toggle(role, perm)} disabled={role === 'admin' && perm === 'manage_users'} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
          <div style={{ display: 'flex', background: '#f8f9fa', borderBottom: '1px solid #e8eaed', padding: '12px 20px', gap: 8 }}>
            <div style={{ flex: 3, fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tp.permission}
            </div>
            {roleNames.map(role => {
              const rc = roleColor(role);
              const roleDoc = roles.find(r => r.name === role);
              return (
                <div key={role} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ background: rc.bg, color: rc.color, borderRadius: 12, padding: '3px 12px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {roleDoc?.label ?? role}
                  </span>
                  {dirty[role] && (
                    <button
                      onClick={() => saveRole(role)}
                      disabled={saving === role}
                      style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {saving === role ? tp.saving : tp.save}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {permKeys.map((perm, i) => (
            <div key={perm} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 8, borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
              <div style={{ flex: 3 }}>
                <span style={{ fontSize: 14, color: '#202124', fontFamily: "'Google Sans'", fontWeight: 500 }}>{tp.permLabels[perm] ?? perm}</span>
                {tp.permDescriptions[perm] && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5f6368' }}>{tp.permDescriptions[perm]}</p>
                )}
              </div>
              {roleNames.map(role => (
                <div key={role} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <Toggle
                    checked={getVal(role, perm)}
                    onChange={() => toggle(role, perm)}
                    disabled={role === 'admin' && perm === 'manage_users'}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#9aa0a6', marginTop: 16, fontFamily: "'Google Sans'" }}>
        {tp.note}
      </p>
    </div>
  );
}

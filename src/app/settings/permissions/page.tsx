'use client';

import { useState, useEffect, useCallback } from 'react';
import { useT } from '@/lib/LanguageContext';

interface RoleDoc {
  _id: string;
  name: string;
  label: string;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
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

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={disabled ? undefined : onChange}
      className="relative flex-shrink-0 border-none"
      style={{
        width: 40, height: 22, borderRadius: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#dadce0' : checked ? '#1a73e8' : '#dadce0',
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <span className="absolute rounded-full bg-white"
        style={{
          top: 3, left: checked ? 21 : 3,
          width: 16, height: 16,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)'
        }} />
    </button>
  );
}

export default function PermissionsPage() {
  const t = useT();
  const tp = t.permissions;

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [permKeys, setPermKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [dirty, setDirty] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
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
    setSelectedRole(prev => prev || Object.keys(data.matrix ?? {})[0] || '');
  }, [tp.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const toggle = (role: string, perm: string) => {
    setDirty(d => ({
      ...d,
      [role]: {
        ...(d[role] ?? matrix![role]),
        [perm]: !(d[role]?.[perm] ?? matrix![role][perm])
      }
    }));
  };

  const getVal = (role: string, perm: string) =>
    dirty[role] ? dirty[role][perm] : matrix![role][perm];

  const saveRole = async (role: string) => {
    setSaving(role);
    const permissions = { ...(matrix![role] ?? {}), ...(dirty[role] ?? {}) };
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions })
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
    return <p className="text-g-text-2 text-sm">{tp.loading}</p>;
  }

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000}}>
          {notification.msg}
        </div>
      )}

      {/* Role selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <label htmlFor="role-select" className="text-[13px] font-medium text-g-text-2 uppercase tracking-[0.06em]">
          {tp.selectRole}
        </label>
        <select
          id="role-select"
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value)}
          className="w-full sm:w-auto sm:min-w-[200px] rounded-lg border border-g-border bg-g-surface text-sm text-g-text py-2.5 px-3.5 cursor-pointer focus:outline-none focus:border-google-blue"
        >
          {roleNames.map(role => {
            const roleDoc = roles.find(r => r.name === role);
            return <option key={role} value={role}>{roleDoc?.label ?? role}</option>;
          })}
        </select>
      </div>

      {selectedRole && (
        <div className="bg-g-surface rounded-2xl border border-g-border overflow-hidden shadow-google-1">
          <div className="flex items-center justify-between gap-2 bg-g-bg border-b border-g-border" style={{ padding: '12px 20px' }}>
            {(() => {
              const rc = roleColor(selectedRole);
              const roleDoc = roles.find(r => r.name === selectedRole);
              return (
                <span className="rounded-xl py-[3px] px-3 text-xs font-medium whitespace-nowrap" style={{ background: rc.bg, color: rc.color }}>
                  {roleDoc?.label ?? selectedRole}
                </span>
              );
            })()}
            {dirty[selectedRole] && (
              <button
                onClick={() => saveRole(selectedRole)}
                disabled={saving === selectedRole}
                className="bg-google-blue text-white border-none rounded-full py-1.5 px-4 text-[13px] font-medium cursor-pointer whitespace-nowrap"
              >
                {saving === selectedRole ? tp.saving : tp.save}
              </button>
            )}
          </div>

          {permKeys.map((perm, i) => (
            <div key={perm} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i > 0 ? '1px solid var(--google-border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-g-text font-medium">{tp.permLabels[perm] ?? perm}</span>
                {tp.permDescriptions[perm] && (
                  <p className="mt-0.5 mb-0 text-xs text-g-text-2">{tp.permDescriptions[perm]}</p>
                )}
              </div>
              <Toggle
                checked={getVal(selectedRole, perm)}
                onChange={() => toggle(selectedRole, perm)}
                disabled={selectedRole === 'admin' && perm === 'manage_users'}
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-g-text-3 mt-4">{tp.note}</p>
    </div>
  );
}

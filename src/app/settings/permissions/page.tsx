'use client';

import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
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
  viewer:  { bg: '#f1f3f4', color: '#5f6368' },
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
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span className="absolute rounded-full bg-white"
        style={{
          top: 3, left: checked ? 21 : 3,
          width: 16, height: 16,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }} />
    </button>
  );
}

export default function PermissionsPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.permissions;

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [permKeys, setPermKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [dirty, setDirty] = useState<Record<string, Record<string, boolean>>>({});

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
  }, [tp.loadFailed]);

  useEffect(() => { load(); }, [load]);

  const toggle = (role: string, perm: string) => {
    setDirty(d => ({
      ...d,
      [role]: {
        ...(d[role] ?? matrix![role]),
        [perm]: !(d[role]?.[perm] ?? matrix![role][perm]),
      },
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
    return <p className="text-[#5f6368] text-sm" style={{ fontFamily: "'Google Sans'" }}>{tp.loading}</p>;
  }

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000, fontFamily: "'Google Sans'" }}>
          {notification.msg}
        </div>
      )}

      {isMobile ? (
        <div className="flex flex-col gap-4">
          {roleNames.map(role => {
            const rc = roleColor(role);
            const roleDoc = roles.find(r => r.name === role);
            const isDirty = !!dirty[role];
            return (
              <div key={role} className="bg-white rounded-xl border border-[#e8eaed] shadow-google-1" style={{ padding: '20px 16px' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-xl py-[3px] px-3 text-[13px] font-medium" style={{ background: rc.bg, color: rc.color, fontFamily: "'Google Sans'" }}>
                    {roleDoc?.label ?? role}
                  </span>
                  {isDirty && (
                    <button
                      onClick={() => saveRole(role)}
                      disabled={saving === role}
                      className="bg-google-blue text-white border-none rounded-lg py-[7px] px-4 text-[13px] font-medium cursor-pointer"
                      style={{ fontFamily: "'Google Sans'" }}
                    >
                      {saving === role ? tp.saving : tp.save}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  {permKeys.map(perm => (
                    <div key={perm} className="flex items-center justify-between">
                      <span className="text-[13px] text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>{tp.permLabels[perm] ?? perm}</span>
                      <Toggle checked={getVal(role, perm)} onChange={() => toggle(role, perm)} disabled={role === 'admin' && perm === 'manage_users'} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e8eaed] overflow-hidden shadow-google-1">
          <div className="flex bg-[#f8f9fa] border-b border-[#e8eaed] gap-2" style={{ padding: '12px 20px' }}>
            <div className="flex-[3] text-[11px] font-medium text-[#5f6368] uppercase tracking-[0.06em]">
              {tp.permission}
            </div>
            {roleNames.map(role => {
              const rc = roleColor(role);
              const roleDoc = roles.find(r => r.name === role);
              return (
                <div key={role} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="rounded-xl py-[3px] px-3 text-xs font-medium whitespace-nowrap" style={{ background: rc.bg, color: rc.color, fontFamily: "'Google Sans'" }}>
                    {roleDoc?.label ?? role}
                  </span>
                  {dirty[role] && (
                    <button
                      onClick={() => saveRole(role)}
                      disabled={saving === role}
                      className="bg-google-blue text-white border-none rounded-md py-1 px-3 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                      style={{ fontFamily: "'Google Sans'" }}
                    >
                      {saving === role ? tp.saving : tp.save}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {permKeys.map((perm, i) => (
            <div key={perm} className="flex items-center gap-2" style={{ padding: '14px 20px', borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
              <div className="flex-[3]">
                <span className="text-sm text-[#202124] font-medium" style={{ fontFamily: "'Google Sans'" }}>{tp.permLabels[perm] ?? perm}</span>
                {tp.permDescriptions[perm] && (
                  <p className="mt-0.5 mb-0 text-xs text-[#5f6368]">{tp.permDescriptions[perm]}</p>
                )}
              </div>
              {roleNames.map(role => (
                <div key={role} className="flex-1 flex justify-center">
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

      <p className="text-xs text-[#9aa0a6] mt-4" style={{ fontFamily: "'Google Sans'" }}>
        {tp.note}
      </p>
    </div>
  );
}

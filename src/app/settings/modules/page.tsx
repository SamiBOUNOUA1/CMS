'use client';

import { useState, useEffect } from 'react';
import { useT, useLanguage } from '@/lib/LanguageContext';

interface Module {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  icon: string;
  color: string;
  builtIn: boolean;
  isEnabled: boolean;
}

const ClipboardListIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </svg>
);

const WarehouseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35zM12 4.44L6.08 6.8H17.92L12 4.44zM4 20h16V8.8H4V20zm3-8h10v2H7v-2zm0 4h7v2H7v-2z" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
);

const ICON_MAP: Record<string, React.ComponentType> = {
  ClipboardList: ClipboardListIcon,
  Warehouse: WarehouseIcon,
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative flex-shrink-0 border-none p-0"
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? '#1a73e8' : '#dadce0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span className="absolute block rounded-full bg-white"
        style={{
          top: 3, left: checked ? 23 : 3,
          width: 18, height: 18,
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          transition: 'left 0.2s',
        }} />
    </button>
  );
}

export default function ModulesSettingsPage() {
  const t = useT();
  const ts = t.modulesSettings;
  const { lang } = useLanguage();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ permissions?: Record<string, boolean> } | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user));
  }, []);

  useEffect(() => {
    fetch('/api/settings/modules')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setModules(d.modules ?? []); setLoading(false); })
      .catch(() => { setError(ts.loadFailed); setLoading(false); });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleToggle = async (mod: Module, newValue: boolean) => {
    const prev = modules;
    setModules(m => m.map(x => x.id === mod.id ? { ...x, isEnabled: newValue } : x));
    try {
      const res = await fetch('/api/settings/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: mod.id, isEnabled: newValue }),
      });
      if (!res.ok) throw new Error();
      const label = lang === 'fr' ? mod.nameFr : mod.name;
      showToast(newValue ? ts.notifications.enabled(label) : ts.notifications.disabled(label));
    } catch {
      setModules(prev);
      showToast(ts.saveFailed);
    }
  };

  const canEdit = user?.permissions?.manage_users;

  return (
    <div className="max-w-[640px]">
      <h1 className="text-[22px] font-medium text-g-text m-0 mb-1.5" style={{ fontFamily: "'Google Sans'" }}>
        {ts.title}
      </h1>
      <p className="m-0 mb-7 text-sm text-g-text-2">
        {ts.subtitle}
      </p>

      {loading && (
        <p className="text-sm text-g-text-2">{ts.loading}</p>
      )}
      {error && (
        <p className="text-sm text-google-red">{error}</p>
      )}

      <div className="flex flex-col gap-4">
        {modules.map(mod => {
          const IconComp = ICON_MAP[mod.icon] ?? ClipboardListIcon;
          return (
            <div
              key={mod.id}
              className="flex items-center gap-4 rounded-xl border border-g-border bg-g-surface"
              style={{ padding: '20px 24px' }}
            >
              {/* Icon — dynamic color from DB, keep inline */}
              <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: `${mod.color}18`, color: mod.color }}>
                <IconComp />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[15px] font-medium text-g-text" style={{ fontFamily: "'Google Sans'" }}>
                    {mod.name}
                  </span>
                  {mod.builtIn && (
                    <span className="inline-flex items-center gap-1 py-[2px] px-2 rounded-[10px] bg-g-bg text-g-text-2 text-[11px] font-medium">
                      <LockIcon />
                      {ts.alwaysOn}
                    </span>
                  )}
                </div>
                <p className="m-0 text-[13px] text-g-text-2 leading-[1.5]">
                  {mod.description}
                </p>
                {mod.builtIn && (
                  <p className="mt-1 mb-0 text-xs text-g-text-3">
                    {ts.builtInNote}
                  </p>
                )}
              </div>

              {/* Toggle */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-xs text-g-text-2 min-w-[48px] text-right">
                  {mod.isEnabled ? ts.enabled : ts.disabled}
                </span>
                <Toggle
                  checked={mod.isEnabled}
                  disabled={mod.builtIn || !canEdit}
                  onChange={(v) => handleToggle(mod, v)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#323232] text-white py-2.5 px-5 rounded-lg text-sm"
          style={{ zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';
import { useEffect, useState } from 'react';

// ── Icons ────────────────────────────────────────────────────────────────────
const IconCatalog = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
  </svg>
);
const IconEventTypes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);
const IconPermissions = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);
const IconRoles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
  </svg>
);
const IconCompany = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);
const IconOrderStatuses = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
  </svg>
);
const IconCustomerTypes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);
const IconTravelRegions = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);
const IconStaffRoles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 6.08V4h2v2.08A8.01 8.01 0 0 1 19.92 13H22v2h-2.08A8.01 8.01 0 0 1 13 19.92V22h-2v-2.08A8.01 8.01 0 0 1 4.08 15H2v-2h2.08A8.01 8.01 0 0 1 11 6.08zM12 18c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0-4a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
  </svg>
);
const IconWhatsApp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);
const IconFlow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm10-16H7v2h6V1zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM21 7h2V5h-2v2zm0 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM7 5h2V3H7v2zm6 16h-2v2h2v-2zm4 0h-2v2h2v-2zm2-18v2h2c0-1.1-.9-2-2-2z" />
  </svg>
);
const IconModules = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
  </svg>
);
const IconDataManagement = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 10v-2h2v2h-2zm-4 0v-2h2v2H7zm8 0v-2h2v2h-2zM5 20h14v2H5z" />
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

// ── Nav tree definition ───────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  perm: string;
}
interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

function useNavGroups(t: ReturnType<typeof useT>, perms: Record<string, boolean>): NavGroup[] {
  const ts = t.settings;
  return [
    {
      key: 'general',
      label: ts.nav.general,
      items: [
        { href: '/settings/company',        label: ts.tabs.company,       icon: <IconCompany />,        perm: 'manage_users' },
        { href: '/settings/whatsapp',       label: ts.tabs.whatsapp,      icon: <IconWhatsApp />,       perm: 'manage_integrations' },
        { href: '/settings/catalog',        label: ts.tabs.catalog,       icon: <IconCatalog />,        perm: 'manage_catalog' },
        { href: '/settings/event-types',      label: ts.tabs.eventTypes,    icon: <IconEventTypes />,      perm: 'manage_event_types' },
        { href: '/settings/order-statuses',  label: ts.tabs.orderStatuses, icon: <IconOrderStatuses />,   perm: 'manage_order_statuses' },
        { href: '/settings/customer-types',  label: ts.tabs.customerTypes, icon: <IconCustomerTypes />,   perm: 'manage_customer_types' },
        { href: '/settings/travel-regions',  label: ts.tabs.travelRegions, icon: <IconTravelRegions />,   perm: 'manage_event_types' },
        { href: '/settings/staff-roles',     label: ts.tabs.staffRoles,    icon: <IconStaffRoles />,       perm: 'manage_event_types' },
        { href: '/settings/flow-templates',  label: ts.tabs.flowTemplates, icon: <IconFlow />,             perm: 'manage_flow_templates' },
      ].filter(i => perms[i.perm]),
    },
    {
      key: 'administration',
      label: ts.nav.administration,
      items: [
        { href: '/settings/modules',         label: ts.tabs.modules,         icon: <IconModules />,         perm: 'manage_users' },
        { href: '/settings/users',           label: ts.tabs.users,           icon: <IconUsers />,           perm: 'manage_users' },
        { href: '/settings/roles',           label: ts.tabs.roles,           icon: <IconRoles />,           perm: 'manage_users' },
        { href: '/settings/permissions',     label: ts.tabs.permissions,     icon: <IconPermissions />,     perm: 'manage_users' },
        { href: '/settings/data-management', label: ts.tabs.dataManagement,  icon: <IconDataManagement />,  perm: 'manage_data' },
      ].filter(i => perms[i.perm]),
    },
  ].filter(g => g.items.length > 0);
}

// ── Sidebar component ─────────────────────────────────────────────────────────
function Sidebar({ groups, pathname, onNavigate }: { groups: NavGroup[]; pathname: string; onNavigate?: () => void }) {
  const initialOpen: Record<string, boolean> = {};
  for (const g of groups) {
    initialOpen[g.key] = g.items.some(i => pathname.startsWith(i.href));
  }
  const [open, setOpen] = useState(initialOpen);

  const toggle = (key: string) => setOpen(o => ({ ...o, [key]: !o[key] }));

  return (
    <nav className="w-full">
      {groups.map(group => (
        <div key={group.key} className="mb-1">
          <button
            onClick={() => toggle(group.key)}
            className="w-full flex items-center justify-between py-2 px-3 border-none bg-transparent cursor-pointer rounded-lg gap-2"
          >
            <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>
              {group.label}
            </span>
            <IconChevron open={open[group.key]} />
          </button>

          {open[group.key] && (
            <div className="mt-0.5 flex flex-col gap-0.5">
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-lg no-underline text-sm transition-[background,color] duration-[120ms]"
                    style={{
                      fontFamily: "'Google Sans'",
                      fontWeight: active ? 600 : 400,
                      color: active ? '#1a73e8' : '#3c4043',
                      background: active ? '#e8f0fe' : 'transparent',
                      borderLeft: active ? '3px solid #1a73e8' : '3px solid transparent',
                    }}
                  >
                    <span className="flex flex-shrink-0" style={{ color: active ? '#1a73e8' : '#5f6368' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const ts = t.settings;

  const [user, setUser] = useState<{ permissions: Record<string, boolean> } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user));
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const perms = user?.permissions ?? {};
  const groups = useNavGroups(t, perms);

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 104px)' }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="hidden sm:block flex-shrink-0 border-r border-google-gray-200 sticky top-0 self-start overflow-y-auto"
        style={{ width: 220, padding: '28px 12px 40px', maxHeight: 'calc(100vh - 104px)' }}
      >
        <div className="mb-5 pl-3">
          <h1 className="text-lg font-medium text-[#202124] m-0" style={{ fontFamily: "'Google Sans'" }}>
            {ts.title}
          </h1>
        </div>
        <Sidebar groups={groups} pathname={pathname} onNavigate={undefined} />
      </aside>

      {/* ── Mobile: top bar ──────────────────────────────────────────────────── */}
      <div
        className="flex sm:hidden fixed left-0 right-0 bg-white border-b border-google-gray-200 items-center gap-3 py-2.5 px-4"
        style={{ top: 104, zIndex: 80 }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="border-none bg-transparent cursor-pointer text-[#5f6368] p-1 flex"
          aria-label="Open settings menu"
        >
          <IconMenu />
        </button>
        <span className="text-[15px] font-medium text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>
          {ts.title}
        </span>
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,.35)', zIndex: 149 }}
          />
          <div className="fixed top-0 left-0 bottom-0 flex flex-col overflow-y-auto bg-white"
            style={{ width: 260, zIndex: 150, boxShadow: '4px 0 24px rgba(0,0,0,.15)' }}>
            <div className="flex items-center justify-between border-b border-[#f1f3f4]" style={{ padding: '18px 16px' }}>
              <span className="text-[17px] font-medium text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>
                {ts.title}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="border-none bg-transparent cursor-pointer text-[#5f6368] p-1 flex"
              >
                <IconClose />
              </button>
            </div>
            <div className="p-4 px-3 flex-1">
              <Sidebar groups={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 settings-main" style={{ padding: '32px 32px 48px' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 639px) {
          .settings-main { padding: 48px 16px 48px !important; }
        }
      `}</style>
    </div>
  );
}

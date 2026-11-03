'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { useUser } from '@/lib/UserContext';

export default function SubNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { modules, perms } = useUser();

  const activeModule = modules.find(mod =>
    mod.isEnabled &&
    mod.permissions.some(p => perms[p]) &&
    mod.routes.some(r => pathname.startsWith(r))
  );

  const visibleSubRoutes = (activeModule?.subRoutes ?? []).filter(
    sr => (!sr.permission || perms[sr.permission]) &&
      (!sr.anyPermission || sr.anyPermission.some(p => perms[p]))
  );

  return (
    <div
      className="subnav-bar fixed top-16 left-0 right-0 h-10 z-[39] flex items-stretch overflow-x-auto overflow-y-hidden"
      style={{
        background: visibleSubRoutes.length > 0 ? 'var(--google-surface)' : 'var(--google-bg)',
        borderBottom: visibleSubRoutes.length > 0 ? '1px solid var(--google-border)' : 'none',
        scrollbarWidth: 'none',
      } as React.CSSProperties}
    >
      {visibleSubRoutes.map(sr => {
        const label = lang === 'fr' ? sr.labelFr : sr.label;
        const isActive = pathname === sr.href || pathname.startsWith(sr.href + '/');
        const color = activeModule?.color ?? '#1a73e8';
        return (
          <Link
            key={sr.href}
            href={sr.href}
            className="px-4 inline-flex items-center no-underline font-sans text-[13px] whitespace-nowrap transition-[color,border-color] duration-150 flex-shrink-0"
            style={{
              color: isActive ? color : 'var(--google-text-secondary)',
              borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

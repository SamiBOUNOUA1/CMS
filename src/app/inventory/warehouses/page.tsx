'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

interface Warehouse {
  _id: string;
  name: string;
  address?: { city?: string; country?: string };
  coordinates?: { lat?: number | null; lng?: number | null };
  isActive: boolean;
  createdAt: string;
}

export default function WarehousesPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.warehousesPage;
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => d?.user?.permissions && setPerms(d.user.permissions));
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/inventory/warehouses?${params}`);
      const data = await res.json();
      setWarehouses(data.warehouses || []);
    } catch {
      showNotification(tp.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const showNotification = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/warehouses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showNotification(tp.deleted);
      fetchWarehouses();
    } catch {
      showNotification(tp.deleteFailed, 'error');
    }
    setDeleteId(null);
  };

  const sorted = [...warehouses].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (a.name || '').localeCompare(b.name || '');
  });

  const coordLabel = (w: Warehouse) => {
    const { lat, lng } = w.coordinates ?? {};
    if (lat != null && lng != null) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    return '—';
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 1100, padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {/* Toast */}
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}
        >
          {notification.msg}
        </div>
      )}

      {/* Delete dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/45 z-[199] flex items-center justify-center p-4">
          <div className="bg-g-surface rounded-2xl p-7 max-w-[400px] w-full shadow-google-3">
            <h3 className="mb-2 text-lg font-medium text-g-text m-0">{tp.deleteDialog.title}</h3>
            <p className="mb-6 text-sm text-g-text-2 leading-relaxed m-0 mt-2">{tp.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="ripple bg-transparent text-g-text-2 border border-g-border rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer transition-google"
              >
                {tp.deleteDialog.cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="ripple bg-google-red text-white border-none rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer transition-google"
              >
                {tp.deleteDialog.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 font-medium text-g-text" style={{ fontSize: isMobile ? 22 : 26 }}>{tp.title}</h1>
          <p className="mt-1 mb-0 text-[13px] text-g-text-2">{tp.warehouseCount(warehouses.length)}</p>
        </div>
        {perms.edit_warehouses && (
          <Link
            href="/inventory/warehouses/new"
            className="ripple bg-google-blue text-white border-none rounded-full py-2.5 px-5 text-sm font-medium no-underline inline-flex items-center gap-1.5 shadow-google-1 transition-google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            {tp.newWarehouse}
          </Link>
        )}
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-g-text-3">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={tp.searchPlaceholder}
            className="w-full box-border py-2.5 pl-11 pr-10 border border-g-border rounded-full text-sm text-g-text outline-none bg-g-surface focus:border-google-blue transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 border-none bg-transparent cursor-pointer text-g-text-3 p-0 flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
          className="py-2.5 px-3 border border-g-border rounded-full text-[13px] text-g-text-2 bg-g-surface cursor-pointer outline-none"
        >
          <option value="name">{tp.sort.nameAZ}</option>
          <option value="newest">{tp.sort.newest}</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-15">
          <div className="w-8 h-8 rounded-full border-[3px] border-g-border border-t-google-green animate-spin mx-auto mb-3" />
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-16 px-5 bg-g-surface border border-g-border rounded-2xl">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor" className="mb-4 text-g-text-3 mx-auto">
            <path d="M20 8.5V8H4v.5L2 9v12h20V9l-2-.5zm-9 10.5H5v-7h6v7zm8 0h-6v-7h6v7zM22 7H2V5h20v2zM11 3H2v2h9V3zm11 0h-9v2h9V3z" />
          </svg>
          <p className="text-base font-medium text-g-text mb-1.5 m-0">{tp.empty.title}</p>
          <p className="text-sm text-g-text-2 m-0">{tp.empty.body}</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && sorted.length > 0 && !isMobile && (
        <div className="bg-g-surface border border-g-border rounded-2xl overflow-hidden shadow-google-1">
          <div className="flex px-5 py-3 bg-g-bg border-b border-g-border">
            {[tp.table.name, tp.table.city, tp.table.coordinates, tp.table.status, tp.table.actions].map((h: string, i: number) => (
              <div
                key={i}
                className="text-[11px] font-semibold text-g-text-2 uppercase tracking-wider"
                style={{ flex: i === 0 ? 2 : i === 4 ? 'none' : 1, width: i === 4 ? 100 : undefined }}
              >
                {h}
              </div>
            ))}
          </div>
          {sorted.map((w) => (
            <div
              key={w._id}
              onClick={() => router.push(`/inventory/warehouses/${w._id}`)}
              className="flex px-5 py-3.5 items-center border-b border-g-border last:border-b-0 cursor-pointer transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--google-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div className="flex-[2] flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[15px] font-medium"
                  style={{ background: avatarColor(w.name) }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 8.5V8H4v.5L2 9v12h20V9l-2-.5zm-9 10.5H5v-7h6v7zm8 0h-6v-7h6v7zM22 7H2V5h20v2zM11 3H2v2h9V3zm11 0h-9v2h9V3z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-g-text overflow-hidden text-ellipsis whitespace-nowrap">{w.name}</span>
              </div>
              <div className="flex-1 text-[13px] text-g-text-2 overflow-hidden text-ellipsis whitespace-nowrap pr-2">
                {[w.address?.city, w.address?.country].filter(Boolean).join(', ') || '—'}
              </div>
              <div className="flex-1 text-[13px] text-g-text-2 font-mono">{coordLabel(w)}</div>
              <div className="flex-1">
                <span
                  className="inline-block py-0.5 px-2.5 rounded-full text-[12px] font-medium"
                  style={{ background: w.isActive ? '#e6f4ea' : '#f1f3f4', color: w.isActive ? '#137333' : '#5f6368' }}
                >
                  {w.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="w-[100px] flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                <Link
                  href={`/inventory/warehouses/${w._id}`}
                  className="ripple p-2 rounded-full text-g-text-2 flex no-underline hover:bg-g-bg transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                </Link>
                {perms.delete_warehouses && (
                  <button
                    onClick={() => setDeleteId(w._id)}
                    className="ripple p-2 rounded-full border-none bg-transparent cursor-pointer text-google-red flex hover:bg-google-red-light transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile cards */}
      {!loading && sorted.length > 0 && isMobile && (
        <div className="flex flex-col gap-2.5">
          {sorted.map(w => (
            <div
              key={w._id}
              onClick={() => router.push(`/inventory/warehouses/${w._id}`)}
              className="bg-g-surface border border-g-border rounded-2xl p-4 cursor-pointer shadow-google-1"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-base font-medium"
                    style={{ background: avatarColor(w.name) }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 8.5V8H4v.5L2 9v12h20V9l-2-.5zm-9 10.5H5v-7h6v7zm8 0h-6v-7h6v7zM22 7H2V5h20v2zM11 3H2v2h9V3zm11 0h-9v2h9V3z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[15px] font-medium text-g-text overflow-hidden text-ellipsis whitespace-nowrap">{w.name}</p>
                    <p className="mt-0.5 mb-0 text-[13px] text-g-text-2 overflow-hidden text-ellipsis whitespace-nowrap">
                      {[w.address?.city, w.address?.country].filter(Boolean).join(', ') || '—'}
                    </p>
                    <p className="mt-px mb-0 text-xs text-g-text-3 font-mono">{coordLabel(w)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span
                    className="py-0.5 px-2.5 rounded-full text-[12px] font-medium"
                    style={{ background: w.isActive ? '#e6f4ea' : '#f1f3f4', color: w.isActive ? '#137333' : '#5f6368' }}
                  >
                    {w.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {perms.delete_warehouses && (
                    <button
                      onClick={() => setDeleteId(w._id)}
                      className="ripple p-1.5 rounded-full border-none bg-transparent cursor-pointer text-google-red flex"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

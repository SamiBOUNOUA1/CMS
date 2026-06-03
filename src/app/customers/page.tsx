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

interface Customer {
  _id: string; name: string; email?: string; phone?: string;
  customerType?: string; createdAt: string;
}
interface CustomerType { key: string; label: string; isActive: boolean; }

export default function CustomersPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.customersPage;
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => d?.user?.permissions && setPerms(d.user.permissions));
    fetch('/api/settings/customer-types')
      .then(r => r.ok ? r.json() : { configs: [] })
      .then((d: any) => setCustomerTypes(d.configs || []));
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('customerType', typeFilter);
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      setCustomers(data.clients || []);
    } catch {
      showNotification(tp.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const showNotification = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showNotification(tp.deleted);
      fetchCustomers();
    } catch {
      showNotification(tp.deleteFailed, 'error');
    }
    setDeleteId(null);
  };

  const typeMap = Object.fromEntries(customerTypes.map(ct => [ct.key, ct.label]));

  const sorted = [...customers].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div className="mx-auto" style={{ maxWidth: 1100, padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}
        >
          {notification.msg}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/45 z-[199] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-7 max-w-[400px] w-full shadow-google-2">
            <h3 className="mb-2 text-lg font-medium text-[#202124]">{tp.deleteDialog.title}</h3>
            <p className="mb-6 text-sm text-[#5f6368] leading-relaxed">{tp.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="bg-transparent text-[#5f6368] border border-[#dadce0] rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer"
              >
                {tp.deleteDialog.cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="bg-google-red text-white border-none rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer"
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
          <h1 className="m-0 font-normal text-[#202124]" style={{ fontSize: isMobile ? 22 : 28 }}>{tp.title}</h1>
          <p className="mt-1 mb-0 text-[13px] text-[#5f6368]">{tp.customerCount(customers.length)}</p>
        </div>
        {perms.edit_customers && (
          <Link href="/customers/new" className="bg-google-blue text-white border-none rounded-full py-2.5 px-5 text-sm font-medium no-underline inline-flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            {tp.newCustomer}
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder={tp.searchPlaceholder}
          className="w-full box-border py-2.5 pl-10 pr-10 border border-[#dadce0] rounded-full text-sm text-[#202124] outline-none bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 border-none bg-none cursor-pointer text-[#9aa0a6] p-0 flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}
      </div>

      {/* Filter chips + sort */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          <button
            onClick={() => setTypeFilter('all')}
            className="py-1.5 px-4 rounded-full text-[13px] font-medium cursor-pointer border"
            style={{ background: typeFilter === 'all' ? '#e8f0fe' : 'transparent', color: typeFilter === 'all' ? '#1a73e8' : '#5f6368', borderColor: typeFilter === 'all' ? '#c5d8fd' : '#dadce0' }}
          >
            {tp.filter.all}
          </button>
          {customerTypes.filter(ct => ct.isActive).map(ct => (
            <button
              key={ct.key}
              onClick={() => setTypeFilter(ct.key)}
              className="py-1.5 px-4 rounded-full text-[13px] font-medium cursor-pointer border"
              style={{ background: typeFilter === ct.key ? '#e8f0fe' : 'transparent', color: typeFilter === ct.key ? '#1a73e8' : '#5f6368', borderColor: typeFilter === ct.key ? '#c5d8fd' : '#dadce0' }}
            >
              {ct.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
          className="py-1.5 px-3 border border-[#dadce0] rounded-lg text-[13px] text-[#5f6368] bg-white cursor-pointer outline-none"
        >
          <option value="name">{tp.sort.nameAZ}</option>
          <option value="newest">{tp.sort.newest}</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-15 text-[#9aa0a6]">
          <div className="w-8 h-8 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin mx-auto mb-3" />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-15 px-5 text-[#9aa0a6]">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="#dadce0" className="mb-4">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <p className="text-base font-medium text-[#5f6368] mb-1.5">{tp.empty.title}</p>
          <p className="text-sm text-[#9aa0a6] m-0">{tp.empty.body}</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && sorted.length > 0 && !isMobile && (
        <div className="bg-white border border-[#e8eaed] rounded-xl overflow-hidden">
          <div className="flex px-5 py-2.5 bg-[#f8f9fa] border-b border-[#e8eaed]">
            {[tp.table.name, tp.table.email, tp.table.phone, tp.table.type, tp.table.actions].map((h: string, i: number) => (
              <div key={i} style={{ flex: i === 0 ? 2 : i === 4 ? 'none' : 1, width: i === 4 ? 100 : undefined }}
                className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wide">
                {h}
              </div>
            ))}
          </div>
          {sorted.map((c, idx) => (
            <div
              key={c._id}
              onClick={() => router.push(`/customers/${c._id}`)}
              className="flex px-5 py-3.5 items-center border-b border-[#f1f3f4] cursor-pointer last:border-b-0"
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div className="flex-[2] flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[15px] font-medium"
                  style={{ background: avatarColor(c.name) }}
                >
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[#202124] overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</span>
              </div>
              <div className="flex-1 text-[13px] text-[#5f6368] overflow-hidden text-ellipsis whitespace-nowrap pr-2">{c.email || '—'}</div>
              <div className="flex-1 text-[13px] text-[#5f6368]">{c.phone || '—'}</div>
              <div className="flex-1">
                {c.customerType && typeMap[c.customerType] ? (
                  <span className="inline-block py-0.5 px-2.5 rounded-xl text-xs font-medium bg-[#e8f0fe] text-google-blue">
                    {typeMap[c.customerType]}
                  </span>
                ) : (
                  <span className="text-[13px] text-[#dadce0]">—</span>
                )}
              </div>
              <div className="w-[100px] flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                <Link
                  href={`/customers/${c._id}`}
                  className="p-1.5 rounded-md text-[#5f6368] flex no-underline"
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                </Link>
                {perms.delete_customers && (
                  <button
                    onClick={() => setDeleteId(c._id)}
                    className="p-1.5 rounded-md border-none bg-none cursor-pointer text-google-red flex"
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
          {sorted.map(c => (
            <div
              key={c._id}
              onClick={() => router.push(`/customers/${c._id}`)}
              className="bg-white border border-[#e8eaed] rounded-xl p-4 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-base font-medium"
                    style={{ background: avatarColor(c.name) }}
                  >
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-[15px] font-medium text-[#202124] overflow-hidden text-ellipsis whitespace-nowrap">{c.name}</p>
                    <p className="mt-0.5 mb-0 text-[13px] text-[#5f6368] overflow-hidden text-ellipsis whitespace-nowrap">{c.email || '—'}</p>
                    {c.phone && <p className="mt-px mb-0 text-xs text-[#9aa0a6]">{c.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {c.customerType && typeMap[c.customerType] && (
                    <span className="py-0.5 px-2 rounded-xl text-[11px] font-medium bg-[#e8f0fe] text-google-blue">
                      {typeMap[c.customerType]}
                    </span>
                  )}
                  {perms.delete_customers && (
                    <button
                      onClick={() => setDeleteId(c._id)}
                      className="p-1.5 rounded-md border-none bg-none cursor-pointer text-google-red flex"
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

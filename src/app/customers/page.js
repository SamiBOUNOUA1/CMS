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

export default function CustomersPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.customersPage;
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [perms, setPerms] = useState({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.user?.permissions && setPerms(d.user.permissions));
    fetch('/api/settings/customer-types')
      .then(r => r.ok ? r.json() : { configs: [] })
      .then(d => setCustomerTypes(d.configs || []));
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

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async (id) => {
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
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    return (a.name || '').localeCompare(b.name || '');
  });

  const btnFilled = {
    background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 24, padding: '10px 20px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
  };

  const chipBase = {
    padding: '6px 16px', borderRadius: 20, fontSize: 13,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
    border: '1px solid #dadce0', background: 'transparent', color: '#5f6368',
  };
  const chipActive = { ...chipBase, background: '#e8f0fe', color: '#1a73e8', border: '1px solid #c5d8fd' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {/* Toast notification */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#137333',
          color: '#fff', padding: '12px 24px', borderRadius: 8,
          fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
          zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.2)', whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124' }}>
              {tp.deleteDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', lineHeight: 1.5 }}>
              {tp.deleteDialog.body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{ ...btnFilled, background: 'transparent', color: '#5f6368', border: '1px solid #dadce0' }}
              >
                {tp.deleteDialog.cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                style={{ ...btnFilled, background: '#d93025' }}
              >
                {tp.deleteDialog.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: isMobile ? 22 : 28, fontWeight: 400, color: '#202124' }}>
            {tp.title}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5f6368', fontFamily: 'Roboto, Arial' }}>
            {tp.customerCount(customers.length)}
          </p>
        </div>
        {perms.edit_customers && (
          <Link href="/customers/new" style={btnFilled}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            {tp.newCustomer}
          </Link>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tp.searchPlaceholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 40px 10px 40px', border: '1px solid #dadce0',
            borderRadius: 24, fontSize: 14, fontFamily: 'Roboto, Arial', color: '#202124',
            outline: 'none', background: '#fff',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#9aa0a6', padding: 0, display: 'flex' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}
      </div>

      {/* Filter chips + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          <button onClick={() => setTypeFilter('all')} style={typeFilter === 'all' ? chipActive : chipBase}>
            {tp.filter.all}
          </button>
          {customerTypes.filter(ct => ct.isActive).map(ct => (
            <button key={ct.key} onClick={() => setTypeFilter(ct.key)} style={typeFilter === ct.key ? chipActive : chipBase}>
              {ct.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '6px 12px', border: '1px solid #dadce0', borderRadius: 8,
            fontSize: 13, fontFamily: "'Google Sans'", color: '#5f6368',
            background: '#fff', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="name">{tp.sort.nameAZ}</option>
          <option value="newest">{tp.sort.newest}</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9aa0a6', fontFamily: "'Google Sans'", fontSize: 15 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9aa0a6' }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="#dadce0" style={{ marginBottom: 16 }}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#5f6368', margin: '0 0 6px' }}>{tp.empty.title}</p>
          <p style={{ fontSize: 14, color: '#9aa0a6', margin: 0 }}>{tp.empty.body}</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && sorted.length > 0 && !isMobile && (
        <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'flex', padding: '10px 20px', background: '#f8f9fa', borderBottom: '1px solid #e8eaed' }}>
            {[tp.table.name, tp.table.email, tp.table.phone, tp.table.type, tp.table.actions].map((h, i) => (
              <div key={i} style={{
                flex: i === 0 ? 2 : i === 4 ? 'none' : 1,
                width: i === 4 ? 100 : undefined,
                fontSize: 11, fontWeight: 600, color: '#5f6368',
                fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {h}
              </div>
            ))}
          </div>

          {sorted.map((c, idx) => (
            <div
              key={c._id}
              onClick={() => router.push(`/customers/${c._id}`)}
              style={{
                display: 'flex', padding: '14px 20px', alignItems: 'center',
                borderBottom: idx < sorted.length - 1 ? '1px solid #f1f3f4' : 'none',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {/* Name + avatar */}
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(c.name), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 500, fontFamily: "'Google Sans'",
                }}>
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </span>
              </div>

              {/* Email */}
              <div style={{ flex: 1, fontSize: 13, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                {c.email || '—'}
              </div>

              {/* Phone */}
              <div style={{ flex: 1, fontSize: 13, color: '#5f6368' }}>
                {c.phone || '—'}
              </div>

              {/* Type badge */}
              <div style={{ flex: 1 }}>
                {c.customerType && typeMap[c.customerType] ? (
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                    fontSize: 12, fontWeight: 500, background: '#e8f0fe', color: '#1a73e8',
                    fontFamily: "'Google Sans'",
                  }}>
                    {typeMap[c.customerType]}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: '#dadce0' }}>—</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ width: 100, display: 'flex', justifyContent: 'flex-end', gap: 4 }} onClick={e => e.stopPropagation()}>
                <Link
                  href={`/customers/${c._id}`}
                  title="View"
                  style={{ padding: 6, borderRadius: 6, color: '#5f6368', display: 'flex', textDecoration: 'none' }}
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                </Link>
                {perms.delete_customers && (
                  <button
                    title="Delete"
                    onClick={() => setDeleteId(c._id)}
                    style={{ padding: 6, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#d93025', display: 'flex' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(c => (
            <div
              key={c._id}
              onClick={() => router.push(`/customers/${c._id}`)}
              style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 16, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(c.name), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 500, fontFamily: "'Google Sans'",
                  }}>
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email || '—'}
                    </p>
                    {c.phone && <p style={{ margin: '1px 0 0', fontSize: 12, color: '#9aa0a6' }}>{c.phone}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {c.customerType && typeMap[c.customerType] && (
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: '#e8f0fe', color: '#1a73e8', fontFamily: "'Google Sans'" }}>
                      {typeMap[c.customerType]}
                    </span>
                  )}
                  {perms.delete_customers && (
                    <button
                      onClick={() => setDeleteId(c._id)}
                      style={{ padding: 6, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#d93025', display: 'flex' }}
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

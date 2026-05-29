'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';

const EVENT_TYPE_ICONS = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function formatCurrency(n, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

export default function OrdersPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.ordersPage;
  const currency = useCurrency();

  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [perms, setPerms] = useState({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.user?.permissions && setPerms(d.user.permissions));
    fetch('/api/settings/order-statuses')
      .then(r => r.ok ? r.json() : { statuses: [] })
      .then(d => setStatuses(d.statuses || []));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      showNotification(tp.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      showNotification(tp.deleted);
      fetchOrders();
    } catch {
      showNotification(tp.deleteFailed, 'error');
    }
    setDeleteId(null);
  };

  const statusMap = Object.fromEntries(statuses.map(s => [s.name, s]));

  const sorted = [...orders].sort((a, b) => {
    if (sortBy === 'total') return (b.activeQuoteTotal || 0) - (a.activeQuoteTotal || 0);
    if (sortBy === 'client') return (a.clientName || '').localeCompare(b.clientName || '');
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const withEventCount = orders.filter(o => o.event).length;
  const totalPipeline = orders.reduce((s, o) => s + (o.activeQuoteTotal || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '12px 24px', borderRadius: 8, zIndex: 1000,
          fontSize: 14, fontFamily: "'Google Sans', Arial", boxShadow: '0 4px 12px rgba(0,0,0,.3)', whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 400, boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500, margin: '0 0 12px', color: '#202124' }}>{tp.deleteDialog.title}</h3>
            <p style={{ fontSize: 14, color: '#5f6368', margin: '0 0 24px' }}>{tp.deleteDialog.body}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={btnOutline}>{tp.deleteDialog.cancel}</button>
              <button onClick={() => handleDelete(deleteId)} style={{ ...btnFilled, background: '#d93025' }}>{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Google Sans'", fontSize: isMobile ? 22 : 28, fontWeight: 400, color: '#202124', margin: 0 }}>{tp.title}</h1>
          <p style={{ fontSize: 13, color: '#5f6368', margin: '4px 0 0' }}>{tp.orderCount(orders.length)}</p>
        </div>
        {perms.create_orders && (
          <Link href="/orders/new" style={{ ...btnFilled, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: isMobile ? 0 : 6 }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            {!isMobile && tp.newOrder}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {[
          { label: tp.stats.total,    value: orders.length,               icon: '📋', color: '#1a73e8' },
          { label: tp.stats.withEvent, value: withEventCount,              icon: '✅', color: '#137333' },
          { label: tp.stats.quotes,   value: orders.reduce((s, o) => s + (o.quoteCount || 0), 0), icon: '📄', color: '#f9ab00' },
          { label: tp.stats.pipeline, value: formatCurrency(totalPipeline, currency), icon: '💶', color: '#1a73e8', large: true },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: isMobile ? '14px 16px' : '20px 24px', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{card.icon}</span>
              <span style={{ fontSize: 11, color: '#5f6368' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: card.large ? (isMobile ? 15 : 18) : (isMobile ? 22 : 28), fontFamily: "'Google Sans'", fontWeight: 400, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 28, border: '1px solid #dadce0', display: 'flex', alignItems: 'center', padding: '4px 16px', marginBottom: 16, boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6" style={{ marginRight: 10, flexShrink: 0 }}>
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder={tp.searchPlaceholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#202124', background: 'transparent', fontFamily: 'Roboto, Arial', minWidth: 0 }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#5f6368' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {['all', ...statuses.map(s => s.name)].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: '1px solid',
              borderColor: statusFilter === s ? '#1a73e8' : '#dadce0',
              background: statusFilter === s ? '#e8f0fe' : '#fff',
              color: statusFilter === s ? '#1a73e8' : '#5f6368',
              fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {s === 'all' ? tp.filter.all : (statusMap[s]?.label || s)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ border: '1px solid #dadce0', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#202124', background: '#fff', cursor: 'pointer', outline: 'none' }}
          >
            <option value="date">{tp.sort.newest}</option>
            <option value="total">{tp.sort.highestValue}</option>
            <option value="client">{tp.sort.clientAZ}</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
      ) : sorted.length === 0 ? (
        <EmptyState tp={tp} canCreate={perms.create_orders} />
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(order => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
            const statusFg = sc?.color || '#5f6368';
            return (
              <div key={order._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: 16, boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: avatarColor(order.clientName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 15 }}>
                      {(order.clientName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 14, color: '#202124' }}>{order.clientName}</div>
                      <div style={{ fontSize: 12, color: '#5f6368', marginTop: 1 }}>
                        {EVENT_TYPE_ICONS[order.eventType] || '📋'} {t.eventTypes[order.eventType] || order.eventType}
                        {order.eventDate ? ` · ${format(new Date(order.eventDate), 'dd MMM yyyy')}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 15, color: '#202124', flexShrink: 0 }}>
                    {formatCurrency(order.activeQuoteTotal, currency)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ background: statusBg, color: statusFg, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                    {sc?.label || order.status}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Link href={`/orders/${order._id}`} style={{ ...iconBtn, color: '#5f6368' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                    </Link>
                    {perms.delete_orders && (
                      <button onClick={() => setDeleteId(order._id)} style={{ ...iconBtn, color: '#d93025' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', boxShadow: '0 1px 2px rgba(60,64,67,.08)', overflow: 'hidden' }}>
          <div style={{ ...tableRow, background: '#f8f9fa', fontWeight: 500, fontSize: 11, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <div style={{ flex: 2 }}>{tp.table.clientEvent}</div>
            <div style={{ flex: 1 }}>{tp.table.date}</div>
            <div style={{ flex: 1 }}>{tp.table.guests}</div>
            <div style={{ flex: 1 }}>{tp.table.status}</div>
            <div style={{ flex: 1, textAlign: 'center' }}>{tp.table.quotes}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>{tp.table.total}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>{tp.table.actions}</div>
          </div>
          {sorted.map((order, i) => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
            const statusFg = sc?.color || '#5f6368';
            return (
              <div
                key={order._id}
                style={{ ...tableRow, borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: avatarColor(order.clientName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 16 }}>
                    {(order.clientName || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 14, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.clientName}</div>
                    <div style={{ fontSize: 12, color: '#5f6368', marginTop: 2 }}>{EVENT_TYPE_ICONS[order.eventType] || '📋'} {t.eventTypes[order.eventType] || order.eventType}</div>
                  </div>
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#5f6368' }}>{order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'}</div>
                <div style={{ flex: 1, fontSize: 13, color: '#5f6368' }}>
                  {order.tableCount
                    ? tp.tables(order.tableCount, order.guestCount)
                    : order.guestCount ? tp.guests(order.guestCount) : '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ background: statusBg, color: statusFg, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                    {sc?.label || order.status}
                  </span>
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: '#5f6368' }}>
                  {order.quoteCount || 0}
                  {order.activeQuoteVersion ? ` (v${order.activeQuoteVersion} active)` : ''}
                </div>
                <div style={{ flex: 1, textAlign: 'right', fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 15, color: '#202124' }}>
                  {formatCurrency(order.activeQuoteTotal, currency)}
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                  <Link href={`/orders/${order._id}`} style={iconBtn}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  </Link>
                  {perms.delete_orders && (
                    <button onClick={() => setDeleteId(order._id)} style={{ ...iconBtn, color: '#d93025' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 40, height: 40, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ tp, canCreate }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
      <h3 style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 400, color: '#202124', margin: '0 0 8px' }}>{tp.empty.title}</h3>
      <p style={{ fontSize: 14, color: '#5f6368', margin: '0 0 24px' }}>{tp.empty.body}</p>
      {canCreate && <Link href="/orders/new" style={btnFilled}>{tp.newOrder}</Link>}
    </div>
  );
}

const tableRow = { display: 'flex', alignItems: 'center', padding: '16px 24px', gap: 16 };

const btnFilled = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 24, padding: '10px 20px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
};

const btnOutline = {
  background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
  borderRadius: 24, padding: '10px 24px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
};

const iconBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: '50%', border: 'none',
  background: 'transparent', color: '#5f6368', cursor: 'pointer', textDecoration: 'none',
};

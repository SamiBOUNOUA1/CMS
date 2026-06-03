'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { btnFilled, btnOutline } from '@/app/components/FormPrimitives';

const EVENT_TYPE_ICONS: Record<string, string> = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function formatCurrency(n: number | null | undefined, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

interface Status { name: string; label: string; color?: string; }
interface Order {
  _id: string; clientName: string; clientEmail?: string; clientPhone?: string;
  eventType: string; eventDate?: string; guestCount?: number; tableCount?: number;
  status: string; quoteCount?: number; activeQuoteVersion?: number;
  activeQuoteTotal?: number; createdAt: string; event?: unknown;
}

export default function OrdersPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.ordersPage;
  const currency = useCurrency();

  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => d?.user?.permissions && setPerms(d.user.permissions));
    fetch('/api/settings/order-statuses')
      .then(r => r.ok ? r.json() : { statuses: [] })
      .then((d: any) => setStatuses(d.statuses || []));
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

  const showNotification = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDelete = async (id: string) => {
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
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const withEventCount = orders.filter(o => o.event).length;
  const totalPipeline = orders.reduce((s, o) => s + (o.activeQuoteTotal || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto" style={{ padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg z-[1000] text-sm shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124' }}
        >
          {notification.msg}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-google-2">
            <h3 className="text-xl font-medium text-[#202124] mb-3">{tp.deleteDialog.title}</h3>
            <p className="text-sm text-[#5f6368] mb-6">{tp.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className={btnOutline}>{tp.deleteDialog.cancel}</button>
              <button onClick={() => handleDelete(deleteId)} className={`${btnFilled} bg-google-red`}>{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="font-normal text-[#202124] m-0" style={{ fontSize: isMobile ? 22 : 28 }}>{tp.title}</h1>
          <p className="text-[13px] text-[#5f6368] mt-1 mb-0">{tp.orderCount(orders.length)}</p>
        </div>
        {perms.create_orders && (
          <Link href="/orders/new" className={`${btnFilled} flex-shrink-0 flex items-center`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: isMobile ? 0 : 6 }}>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            {!isMobile && tp.newOrder}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        {[
          { label: tp.stats.total, value: orders.length, icon: '📋', color: '#1a73e8' },
          { label: tp.stats.withEvent, value: withEventCount, icon: '✅', color: '#137333' },
          { label: tp.stats.quotes, value: orders.reduce((s, o) => s + (o.quoteCount || 0), 0), icon: '📄', color: '#f9ab00' },
          { label: tp.stats.pipeline, value: formatCurrency(totalPipeline, currency), icon: '💶', color: '#1a73e8', large: true },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-google-gray-200 shadow-google-1" style={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">{card.icon}</span>
              <span className="text-[11px] text-[#5f6368]">{card.label}</span>
            </div>
            <div style={{ fontSize: (card as any).large ? (isMobile ? 15 : 18) : (isMobile ? 22 : 28), color: card.color }} className="font-normal">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-full border border-[#dadce0] flex items-center px-4 py-1 mb-4 shadow-google-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6" className="mr-2.5 flex-shrink-0">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder={tp.searchPlaceholder}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="flex-1 border-none outline-none text-[15px] text-[#202124] bg-transparent min-w-0"
        />
        {search && (
          <button onClick={() => setSearch('')} className="border-none bg-none cursor-pointer p-1 text-[#5f6368]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {['all', ...statuses.map(s => s.name)].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="py-1 px-3.5 rounded-full border text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0"
            style={{
              borderColor: statusFilter === s ? '#1a73e8' : '#dadce0',
              background: statusFilter === s ? '#e8f0fe' : '#fff',
              color: statusFilter === s ? '#1a73e8' : '#5f6368',
            }}
          >
            {s === 'all' ? tp.filter.all : (statusMap[s]?.label || s)}
          </button>
        ))}
        <div className="ml-auto flex-shrink-0">
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
            className="border border-[#dadce0] rounded-md py-1 px-2.5 text-xs text-[#202124] bg-white cursor-pointer outline-none"
          >
            <option value="date">{tp.sort.newest}</option>
            <option value="total">{tp.sort.highestValue}</option>
            <option value="client">{tp.sort.clientAZ}</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center p-20"><Spinner /></div>
      ) : sorted.length === 0 ? (
        <EmptyState tp={tp} canCreate={perms.create_orders} />
      ) : isMobile ? (
        <div className="flex flex-col gap-2.5">
          {sorted.map(order => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
            const statusFg = sc?.color || '#5f6368';
            return (
              <div key={order._id} className="bg-white rounded-xl border border-google-gray-200 p-4 shadow-google-1">
                <div className="flex justify-between items-start mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-medium text-[15px] text-white" style={{ background: avatarColor(order.clientName) }}>
                      {(order.clientName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[#202124]">{order.clientName}</div>
                      <div className="text-xs text-[#5f6368] mt-px">
                        {EVENT_TYPE_ICONS[order.eventType] || '📋'} {t.eventTypes[order.eventType] || order.eventType}
                        {order.eventDate ? ` · ${format(new Date(order.eventDate), 'dd MMM yyyy')}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-[15px] text-[#202124] flex-shrink-0">
                    {formatCurrency(order.activeQuoteTotal, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: statusBg, color: statusFg }}>
                    {sc?.label || order.status}
                  </span>
                  <div className="flex gap-1">
                    <Link href={`/orders/${order._id}`} className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#5f6368]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                    </Link>
                    {perms.delete_orders && (
                      <button onClick={() => setDeleteId(order._id)} className="inline-flex items-center justify-center w-9 h-9 rounded-full border-none bg-transparent cursor-pointer text-google-red">
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
        <div className="bg-white rounded-xl border border-google-gray-200 shadow-google-1 overflow-hidden">
          <div className="flex items-center px-6 py-4 gap-4 bg-[#f8f9fa] font-medium text-[11px] text-[#5f6368] uppercase tracking-wider">
            <div className="flex-[2]">{tp.table.clientEvent}</div>
            <div className="flex-1">{tp.table.date}</div>
            <div className="flex-1">{tp.table.guests}</div>
            <div className="flex-1">{tp.table.status}</div>
            <div className="flex-1 text-center">{tp.table.quotes}</div>
            <div className="flex-1 text-right">{tp.table.total}</div>
            <div className="flex-1 text-right">{tp.table.actions}</div>
          </div>
          {sorted.map((order, i) => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
            const statusFg = sc?.color || '#5f6368';
            return (
              <div
                key={order._id}
                className="flex items-center px-6 py-4 gap-4 bg-white transition-colors"
                style={{ borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                <div className="flex-[2] flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium text-base" style={{ background: avatarColor(order.clientName) }}>
                    {(order.clientName || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-[#202124] whitespace-nowrap overflow-hidden text-ellipsis">{order.clientName}</div>
                    <div className="text-xs text-[#5f6368] mt-0.5">{EVENT_TYPE_ICONS[order.eventType] || '📋'} {t.eventTypes[order.eventType] || order.eventType}</div>
                  </div>
                </div>
                <div className="flex-1 text-[13px] text-[#5f6368]">{order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'}</div>
                <div className="flex-1 text-[13px] text-[#5f6368]">
                  {order.tableCount
                    ? tp.tables(order.tableCount, order.guestCount)
                    : order.guestCount ? tp.guests(order.guestCount) : '—'}
                </div>
                <div className="flex-1">
                  <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: statusBg, color: statusFg }}>
                    {sc?.label || order.status}
                  </span>
                </div>
                <div className="flex-1 text-center text-[13px] text-[#5f6368]">
                  {order.quoteCount || 0}
                  {order.activeQuoteVersion ? ` (v${order.activeQuoteVersion} active)` : ''}
                </div>
                <div className="flex-1 text-right font-medium text-[15px] text-[#202124]">
                  {formatCurrency(order.activeQuoteTotal, currency)}
                </div>
                <div className="flex-1 flex justify-end gap-1">
                  <Link href={`/orders/${order._id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#f1f3f4] text-[#5f6368]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  </Link>
                  {perms.delete_orders && (
                    <button onClick={() => setDeleteId(order._id)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#f1f3f4] text-google-red border-none cursor-pointer">
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
    <div className="w-10 h-10 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />
  );
}

function EmptyState({ tp, canCreate }: { tp: any; canCreate: boolean }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-[56px] mb-4">📋</div>
      <h3 className="text-xl font-normal text-[#202124] mb-2">{tp.empty.title}</h3>
      <p className="text-sm text-[#5f6368] mb-6">{tp.empty.body}</p>
      {canCreate && <Link href="/orders/new" className={btnFilled}>{tp.newOrder}</Link>}
    </div>
  );
}

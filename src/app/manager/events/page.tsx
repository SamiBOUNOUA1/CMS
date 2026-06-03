'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';

const EVENT_TYPE_ICONS: Record<string, string> = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', corporate: 'Corporate', birthday: 'Birthday',
  gala: 'Gala', conference: 'Conference', buffet: 'Buffet', other: 'Other',
};

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

export default function ManagerEventsPage() {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/manager/events').then(r => r.ok ? r.json() : { orders: [] }),
      fetch('/api/settings/order-statuses').then(r => r.ok ? r.json() : { statuses: [] }),
    ]).then(([evData, stData]: [any, any]) => {
      setOrders(evData.orders || []);
      setStatuses(stData.statuses || []);
      setLoading(false);
    });
  }, []);

  const statusMap = Object.fromEntries(statuses.map((s: any) => [s.name, s]));

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto" style={{ padding: isMobile ? '20px 16px' : '32px 24px' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-g-text m-0">My Events</h1>
        <p className="mt-1 mb-0 text-sm text-g-text-2">
          {orders.length} event{orders.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-g-surface rounded-2xl border border-g-border py-15 px-6 text-center">
          <div className="text-[40px] mb-3">📋</div>
          <p className="text-base text-g-text-2 m-0">No events assigned to you yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order: any) => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
            const statusFg = sc?.color || '#5f6368';
            return (
              <Link
                key={order._id}
                href={`/manager/events/${order._id}`}
                className="no-underline block"
              >
                <div className="bg-g-surface rounded-xl border border-g-border shadow-google-1 py-4 px-5 flex items-center gap-4 flex-wrap transition-shadow hover:shadow-google-2" style={{ flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <div
                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-medium text-[17px] flex-shrink-0"
                    style={{ background: avatarColor(order.clientName) }}
                  >
                    {(order.clientName || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-g-text mb-0.5">{order.clientName}</div>
                    <div className="text-[13px] text-g-text-2">
                      {EVENT_TYPE_ICONS[order.eventType]} {EVENT_TYPE_LABELS[order.eventType] || order.eventType}
                      {' · '}
                      {order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'}
                      {' · '}
                      {order.tableCount ? `${order.tableCount} tables` : `${order.guestCount} guests`}
                    </div>
                  </div>
                  <span className="rounded-full py-1 px-3 text-xs font-semibold flex-shrink-0" style={{ background: statusBg, color: statusFg }}>
                    {sc?.label || order.status}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-g-text-3">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

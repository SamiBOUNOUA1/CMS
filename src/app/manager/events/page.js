'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';

const EVENT_TYPE_ICONS = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

const EVENT_TYPE_LABELS = {
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
  const [orders, setOrders] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/manager/events').then(r => r.ok ? r.json() : { orders: [] }),
      fetch('/api/settings/order-statuses').then(r => r.ok ? r.json() : { statuses: [] }),
    ]).then(([evData, stData]) => {
      setOrders(evData.orders || []);
      setStatuses(stData.statuses || []);
      setLoading(false);
    });
  }, []);

  const statusMap = Object.fromEntries(statuses.map(s => [s.name, s]));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Google Sans', Arial", fontSize: 24, fontWeight: 400, color: 'var(--google-text-primary)', margin: 0 }}>
          My Events
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--google-text-secondary)' }}>
          {orders.length} event{orders.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: 'var(--google-surface)', borderRadius: 16, border: '1px solid var(--google-border)', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 16, color: 'var(--google-text-secondary)', margin: 0 }}>
            No events assigned to you yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
            const statusFg = sc?.color || '#5f6368';
            return (
              <Link
                key={order._id}
                href={`/manager/events/${order._id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  background: 'var(--google-surface)', borderRadius: 12,
                  border: '1px solid var(--google-border)',
                  boxShadow: '0 1px 3px rgba(60,64,67,.08)',
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: isMobile ? 'wrap' : 'nowrap',
                  transition: 'box-shadow 0.15s',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: avatarColor(order.clientName), color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 17, flexShrink: 0,
                  }}>
                    {(order.clientName || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: 'var(--google-text-primary)', marginBottom: 2 }}>
                      {order.clientName}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--google-text-secondary)' }}>
                      {EVENT_TYPE_ICONS[order.eventType]} {EVENT_TYPE_LABELS[order.eventType] || order.eventType}
                      {' · '}
                      {order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'}
                      {' · '}
                      {order.tableCount ? `${order.tableCount} tables` : `${order.guestCount} guests`}
                    </div>
                  </div>
                  <span style={{
                    background: statusBg, color: statusFg,
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 600, flexShrink: 0,
                  }}>
                    {sc?.label || order.status}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--google-text-tertiary)', flexShrink: 0 }}>
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

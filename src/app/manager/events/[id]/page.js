'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';

const EVENT_TYPE_ICONS = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

const EVENT_TYPE_LABELS = {
  wedding: 'Wedding', corporate: 'Corporate', birthday: 'Birthday',
  gala: 'Gala', conference: 'Conference', buffet: 'Buffet', other: 'Other',
};

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--google-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--google-text-primary)', fontFamily: "'Google Sans'" }}>{value || '—'}</div>
    </div>
  );
}

export default function ManagerEventDetailPage() {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const [order, setOrder] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/manager/events/${id}`),
      fetch('/api/settings/order-statuses').then(r => r.ok ? r.json() : { statuses: [] }),
    ]).then(async ([orderRes, stData]) => {
      if (!orderRes.ok) { setNotFound(true); setLoading(false); return; }
      const orderData = await orderRes.json();
      setOrder(orderData.order);
      setStatuses(stData.statuses || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Google Sans'", fontSize: 16, color: 'var(--google-text-secondary)' }}>Event not found or not assigned to you.</p>
        <Link href="/manager/events" style={{ color: '#1a73e8', fontSize: 14 }}>← Back to My Events</Link>
      </div>
    );
  }

  const statusMap = Object.fromEntries(statuses.map(s => [s.name, s]));
  const sc = statusMap[order.status];
  const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
  const statusFg = sc?.color || '#5f6368';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {/* Back link */}
      <Link href="/manager/events" style={{ fontSize: 13, color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← My Events
      </Link>

      {/* Client + status header */}
      <div style={{ background: 'var(--google-surface)', borderRadius: 16, border: '1px solid var(--google-border)', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500, color: 'var(--google-text-primary)', marginBottom: 2 }}>
              {order.clientName}
            </div>
            <div style={{ fontSize: 13, color: 'var(--google-text-secondary)' }}>
              {order.clientEmail}{order.clientPhone ? ` · ${order.clientPhone}` : ''}
            </div>
          </div>
          <span style={{ background: statusBg, color: statusFg, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 600, flexShrink: 0 }}>
            {sc?.label || order.status}
          </span>
        </div>
      </div>

      {/* Event details */}
      <div style={{ background: 'var(--google-surface)', borderRadius: 16, border: '1px solid var(--google-border)', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 16, padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
          <Field label="Event type" value={`${EVENT_TYPE_ICONS[order.eventType] || ''} ${EVENT_TYPE_LABELS[order.eventType] || order.eventType}`} />
          <Field label="Event date" value={order.eventDate ? format(new Date(order.eventDate), 'EEEE, dd MMM yyyy') : '—'} />
          <Field label="Guests" value={order.tableCount ? `${order.tableCount} tables (~${order.guestCount} guests)` : `${order.guestCount} guests`} />
          <Field label="Start time" value={order.startTime || '—'} />
          {order.notes && (
            <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
              <Field label="Notes" value={order.notes} />
            </div>
          )}
        </div>
      </div>

      {/* Event flow CTA */}
      {order.event ? (
        <Link
          href={`/manager/events/${id}/flow`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#1a73e8', borderRadius: 16, padding: '20px 24px',
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(26,115,232,.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm10-16H7v2h6V1zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM21 7h2V5h-2v2zm0 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM7 5h2V3H7v2zm6 16h-2v2h2v-2zm4 0h-2v2h2v-2zm2-18v2h2c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#fff' }}>Event Flow</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>View and update workflow steps</div>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.8)">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </Link>
      ) : (
        <div style={{ background: 'var(--google-surface)', borderRadius: 16, border: '1px solid var(--google-border)', padding: '20px 24px', textAlign: 'center', color: 'var(--google-text-secondary)', fontSize: 14 }}>
          Event flow not yet available — the event has not been created for this order.
        </div>
      )}
    </div>
  );
}

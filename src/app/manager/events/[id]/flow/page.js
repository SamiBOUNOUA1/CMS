'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:     { bg: '#f1f3f4', text: '#5f6368', dot: '#9aa0a6' },
  in_progress: { bg: '#e8f0fe', text: '#1a73e8', dot: '#1a73e8' },
  completed:   { bg: '#e6f4ea', text: '#137333', dot: '#34a853' },
  skipped:     { bg: '#fef7e0', text: '#b45309', dot: '#f9ab00' },
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

export default function ManagerEventFlowPage() {
  const { id } = useParams();

  const [flowInstance, setFlowInstance] = useState(null);
  const [order, setOrder] = useState(null);
  const [hasEvent, setHasEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => { loadFlow(); }, [id]);

  async function loadFlow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/event-flow`);
      const data = await res.json();
      if (!res.ok) {
        setHasEvent(false);
        setOrder(data.order || null);
        return;
      }
      setHasEvent(!!data.event);
      setFlowInstance(data.flowInstance);
      setOrder(data.order);
    } catch {
      showNotification('Failed to load event flow', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  async function handleStatusChange(stepId, status) {
    try {
      const res = await fetch(`/api/orders/${id}/event-flow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', stepId, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setFlowInstance(data.flowInstance);
      showNotification('Step updated');
    } catch (err) {
      showNotification(err.message || 'Failed to update step', 'error');
    }
  }

  const steps = flowInstance?.steps || [];
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 48px' }}>
      {/* Back link */}
      <div style={{ marginBottom: 20 }}>
        <Link href={`/manager/events/${id}`} style={{
          fontFamily: "'Google Sans'", fontSize: 14, color: '#1a73e8', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Event
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 500, color: 'var(--google-text-primary)', margin: '0 0 4px' }}>
          Event Flow
        </h2>
        {order && (
          <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: 'var(--google-text-secondary)', margin: 0 }}>
            {order.clientName}
            {order.eventDate && ` — ${format(new Date(order.eventDate), 'dd MMM yyyy')}`}
          </p>
        )}
      </div>

      {/* No event linked yet */}
      {!hasEvent && (
        <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: 'var(--google-text-secondary)', margin: 0 }}>
            The event flow has not been set up for this order yet.
          </p>
        </div>
      )}

      {/* No steps */}
      {hasEvent && steps.length === 0 && (
        <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: 'var(--google-text-secondary)', margin: 0 }}>
            No workflow steps have been added yet.
          </p>
        </div>
      )}

      {/* Progress bar */}
      {hasEvent && steps.length > 0 && (
        <div style={{ background: 'var(--google-surface)', border: '1px solid var(--google-border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: 'var(--google-text-primary)' }}>
              {completedCount} of {steps.length} steps completed
            </span>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 13, color: 'var(--google-text-secondary)' }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 8, background: '#f1f3f4', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progressPct}%`, borderRadius: 4,
              background: progressPct === 100 ? '#34a853' : '#1a73e8',
              transition: 'width 0.3s ease',
            }} />
          </div>
          {flowInstance?.templateName && (
            <p style={{ fontFamily: "'Google Sans'", fontSize: 12, color: '#9aa0a6', margin: '8px 0 0' }}>
              Template: {flowInstance.templateName}
            </p>
          )}
        </div>
      )}

      {/* Steps list */}
      {hasEvent && steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, idx) => {
            const colors = STATUS_COLORS[step.status] || STATUS_COLORS.pending;
            return (
              <div key={step._id} style={{
                background: 'var(--google-surface)', border: '1px solid var(--google-border)',
                borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  minWidth: 32, height: 32, borderRadius: '50%',
                  background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, fontFamily: "'Google Sans'" }}>
                    {idx + 1}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: step.description ? 4 : 0 }}>
                    <span style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: 'var(--google-text-primary)' }}>
                      {step.label}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      background: colors.bg, color: colors.text, fontFamily: "'Google Sans'", fontWeight: 500,
                    }}>
                      {STATUS_LABELS[step.status] || step.status}
                    </span>
                  </div>
                  {step.description && (
                    <p style={{ fontFamily: "'Google Sans'", fontSize: 13, color: 'var(--google-text-secondary)', margin: 0 }}>
                      {step.description}
                    </p>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <select
                      value={step.status}
                      onChange={e => handleStatusChange(step._id, e.target.value)}
                      style={{
                        padding: '6px 10px', border: '1px solid #dadce0', borderRadius: 8,
                        fontSize: 13, fontFamily: "'Google Sans'", background: '#fff', cursor: 'pointer',
                        color: colors.text,
                      }}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14,
          fontFamily: "'Google Sans'", zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,.2)',
          whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}

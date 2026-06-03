'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#f1f3f4', text: '#5f6368' },
  in_progress: { bg: '#e8f0fe', text: '#1a73e8' },
  completed:   { bg: '#e6f4ea', text: '#137333' },
  skipped:     { bg: '#fef7e0', text: '#b45309' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

export default function ManagerEventFlowPage() {
  const { id } = useParams() as { id: string };

  const [flowInstance, setFlowInstance] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [hasEvent, setHasEvent] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);

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

  function showNotification(msg: string, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  async function handleStatusChange(stepId: string, status: string) {
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
    } catch (err: any) {
      showNotification(err.message || 'Failed to update step', 'error');
    }
  }

  const steps: any[] = flowInstance?.steps || [];
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-[200px]">
        <div className="w-9 h-9 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin">
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-6 pt-8 pb-12">
      <div className="mb-5">
        <Link href={`/manager/events/${id}`} className="text-sm text-google-blue no-underline inline-flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Event
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-[22px] font-medium text-g-text mb-1">Event Flow</h2>
        {order && (
          <p className="text-sm text-g-text-2 m-0">
            {order.clientName}
            {order.eventDate && ` — ${format(new Date(order.eventDate), 'dd MMM yyyy')}`}
          </p>
        )}
      </div>

      {!hasEvent && (
        <div className="bg-g-surface border border-g-border rounded-xl p-10 text-center">
          <p className="text-sm text-g-text-2 m-0">The event flow has not been set up for this order yet.</p>
        </div>
      )}

      {hasEvent && steps.length === 0 && (
        <div className="bg-g-surface border border-g-border rounded-xl p-10 text-center">
          <p className="text-sm text-g-text-2 m-0">No workflow steps have been added yet.</p>
        </div>
      )}

      {hasEvent && steps.length > 0 && (
        <div className="bg-g-surface border border-g-border rounded-xl p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-g-text">{completedCount} of {steps.length} steps completed</span>
            <span className="text-[13px] text-g-text-2">{progressPct}%</span>
          </div>
          <div className="h-2 bg-[#f1f3f4] rounded overflow-hidden">
            <div className="h-full rounded transition-all duration-300 ease-out" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#34a853' : '#1a73e8' }} />
          </div>
          {flowInstance?.templateName && (
            <p className="text-xs text-[#9aa0a6] mt-2 mb-0">Template: {flowInstance.templateName}</p>
          )}
        </div>
      )}

      {hasEvent && steps.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {steps.map((step: any, idx: number) => {
            const colors = STATUS_COLORS[step.status] || STATUS_COLORS.pending;
            return (
              <div key={step._id} className="bg-g-surface border border-g-border rounded-xl p-3.5 flex gap-3.5 items-start">
                <div className="min-w-[32px] h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                  <span className="text-[13px] font-semibold" style={{ color: colors.text }}>{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <span className="text-[15px] font-medium text-g-text">{step.label}</span>
                    <span className="text-[11px] py-0.5 px-2 rounded-xl font-medium" style={{ background: colors.bg, color: colors.text }}>
                      {STATUS_LABELS[step.status] || step.status}
                    </span>
                  </div>
                  {step.description && <p className="text-[13px] text-g-text-2 m-0">{step.description}</p>}
                  <div className="mt-2.5">
                    <select
                      value={step.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(step._id, e.target.value)}
                      className="py-1.5 px-2.5 border border-[#dadce0] rounded-lg text-[13px] bg-white cursor-pointer outline-none"
                      style={{ color: colors.text }}
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
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-2.5 px-5 rounded-lg text-sm z-[9999] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124' }}
        >
          {notification.msg}
        </div>
      )}
    </div>
  );
}

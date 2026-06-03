'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending:     { bg: '#f1f3f4', text: '#5f6368', dot: '#9aa0a6' },
  in_progress: { bg: '#e8f0fe', text: '#1a73e8', dot: '#1a73e8' },
  completed:   { bg: '#e6f4ea', text: '#137333', dot: '#34a853' },
  skipped:     { bg: '#fef7e0', text: '#b45309', dot: '#f9ab00' },
};

export default function OrderFlowPage() {
  const { id } = useParams() as { id: string };
  const t = useT();
  const tf = t.orderFlow;

  const [flowInstance, setFlowInstance] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);

  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [addingStep, setAddingStep] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => d && setPerms(d.user?.permissions ?? {}));
    loadFlow();
  }, [id]);

  async function loadFlow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/flow`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFlowInstance(data.flowInstance);
      setOrder(data.order);
    } catch {
      showNotification(tf.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(msg: string, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  async function patchFlow(body: object) {
    const res = await fetch(`/api/orders/${id}/flow`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    setFlowInstance(data.flowInstance);
    return data;
  }

  async function handleAddStep() {
    if (!newStepLabel.trim()) return;
    setAddingStep(true);
    try {
      await patchFlow({ action: 'add_step', label: newStepLabel.trim(), description: newStepDesc.trim() });
      setNewStepLabel('');
      setNewStepDesc('');
      setShowAddForm(false);
      showNotification(tf.notifications.stepAdded);
    } catch (err: any) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    } finally {
      setAddingStep(false);
    }
  }

  async function handleRemoveStep(stepId: string) {
    try {
      await patchFlow({ action: 'remove_step', stepId });
      showNotification(tf.notifications.stepDeleted);
    } catch (err: any) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function handleMove(steps: any[], idx: number, dir: number) {
    const arr = [...steps];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
    const reordered = arr.map((s, i) => ({ _id: s._id, sortOrder: i }));
    try {
      await patchFlow({ action: 'reorder', steps: reordered });
      showNotification(tf.notifications.reordered);
    } catch (err: any) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function handleStatusChange(stepId: string, status: string) {
    try {
      await patchFlow({ action: 'update_status', stepId, status });
      showNotification(tf.notifications.statusUpdated);
    } catch (err: any) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  const steps: any[] = flowInstance?.steps || [];
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading) {
    return <div className="p-8 text-[14px] text-[#9aa0a6]">Loading…</div>;
  }

  return (
    <div className="max-w-[760px] mx-auto px-6 pt-8 pb-12">
      {/* Back link */}
      <div className="mb-5">
        <Link href={`/orders/${id}`} className="text-sm text-google-blue no-underline inline-flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          {tf.backToOrder}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[22px] font-medium text-[#202124] mb-1">{tf.title}</h2>
        {order && (
          <p className="text-sm text-[#5f6368] m-0">
            {order.clientName}
            {order.eventDate && ` — ${format(new Date(order.eventDate), 'dd MMM yyyy')}`}
            {order.eventType && (
              <span className="ml-2 text-[11px] py-0.5 px-2 rounded-xl bg-[#e8f0fe] text-google-blue font-medium">
                {order.eventType}
              </span>
            )}
          </p>
        )}
      </div>

      {/* No flow state */}
      {steps.length === 0 && !showAddForm && (
        <div className="bg-white border border-[#e8eaed] rounded-xl p-8 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#dadce0" className="mb-3">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
          <p className="text-sm text-[#5f6368] mb-4">{tf.noFlow}</p>
          {perms.manage_flow_templates && (
            <button onClick={() => setShowAddForm(true)} className="py-2 px-5 bg-google-blue text-white border-none rounded-lg cursor-pointer text-sm font-medium">
              {tf.addStep}
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {steps.length > 0 && (
        <div className="bg-white border border-[#e8eaed] rounded-xl p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#202124]">{tf.progress(completedCount, steps.length)}</span>
            <span className="text-[13px] text-[#5f6368]">{progressPct}%</span>
          </div>
          <div className="h-2 bg-[#f1f3f4] rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#34a853' : '#1a73e8' }}
            />
          </div>
        </div>
      )}

      {/* Steps list */}
      {steps.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-5">
          {steps.map((step: any, idx: number) => {
            const colors = STATUS_COLORS[step.status] || STATUS_COLORS.pending;
            return (
              <div key={step._id} className="bg-white border border-[#e8eaed] rounded-xl p-3.5 flex gap-3.5 items-start">
                <div
                  className="min-w-[32px] h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: colors.bg }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: colors.text }}>{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <span className="text-[15px] font-medium text-[#202124]">{step.label}</span>
                    <span className="text-[11px] py-0.5 px-2 rounded-xl font-medium" style={{ background: colors.bg, color: colors.text }}>
                      {tf.status[step.status] || step.status}
                    </span>
                  </div>
                  {step.description && (
                    <p className="text-[13px] text-[#5f6368] m-0">{step.description}</p>
                  )}
                  {perms.update_flow_status && (
                    <div className="mt-2.5">
                      <select
                        value={step.status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(step._id, e.target.value)}
                        className="py-1.5 px-2.5 border border-[#dadce0] rounded-lg text-[13px] bg-white cursor-pointer outline-none"
                        style={{ color: colors.text }}
                      >
                        {['pending', 'in_progress', 'completed', 'skipped'].map(s => (
                          <option key={s} value={s}>{tf.status[s]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {perms.manage_flow_templates && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => handleMove(steps, idx, -1)} disabled={idx === 0}
                      className="py-1 px-2 bg-none border border-[#dadce0] rounded-md cursor-pointer text-[#5f6368] text-xs"
                      style={{ opacity: idx === 0 ? 0.4 : 1 }} title={tf.moveUp}>↑</button>
                    <button onClick={() => handleMove(steps, idx, 1)} disabled={idx === steps.length - 1}
                      className="py-1 px-2 bg-none border border-[#dadce0] rounded-md cursor-pointer text-[#5f6368] text-xs"
                      style={{ opacity: idx === steps.length - 1 ? 0.4 : 1 }} title={tf.moveDown}>↓</button>
                    <button onClick={() => handleRemoveStep(step._id)}
                      className="py-1 px-2 bg-none border border-[#f5c6c4] rounded-md cursor-pointer text-google-red text-xs" title={tf.deleteStep}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add step button */}
      {perms.manage_flow_templates && steps.length > 0 && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 w-full justify-center py-2.5 px-[18px] bg-white border border-dashed border-[#dadce0] rounded-xl cursor-pointer text-sm text-google-blue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          {tf.addStep}
        </button>
      )}

      {perms.manage_flow_templates && showAddForm && (
        <div className="bg-white border border-[#e8eaed] rounded-xl p-5">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#5f6368] mb-3">{tf.addStep}</p>
          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder={tf.stepLabelPlaceholder}
              value={newStepLabel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStepLabel(e.target.value)}
              className="py-2 px-3 border border-[#dadce0] rounded-lg text-sm bg-white w-full outline-none box-border"
              autoFocus
            />
            <input
              type="text"
              placeholder={tf.stepDescriptionPlaceholder}
              value={newStepDesc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStepDesc(e.target.value)}
              className="py-2 px-3 border border-[#dadce0] rounded-lg text-sm bg-white w-full outline-none box-border"
            />
            <div className="flex gap-2.5">
              <button
                onClick={handleAddStep}
                disabled={addingStep || !newStepLabel.trim()}
                className="py-2 px-5 bg-google-blue text-white border-none rounded-lg cursor-pointer text-sm font-medium"
                style={{ opacity: (!newStepLabel.trim() || addingStep) ? 0.6 : 1 }}
              >
                {tf.addStep}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewStepLabel(''); setNewStepDesc(''); }}
                className="py-2 px-[18px] bg-none border border-[#dadce0] rounded-lg cursor-pointer text-sm text-[#5f6368]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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

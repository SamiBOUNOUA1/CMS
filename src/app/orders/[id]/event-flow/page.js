'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:     { bg: '#f1f3f4', text: '#5f6368', dot: '#9aa0a6' },
  in_progress: { bg: '#e8f0fe', text: '#1a73e8', dot: '#1a73e8' },
  completed:   { bg: '#e6f4ea', text: '#137333', dot: '#34a853' },
  skipped:     { bg: '#fef7e0', text: '#b45309', dot: '#f9ab00' },
};

export default function EventFlowPage() {
  const { id } = useParams();
  const t = useT();
  const tf = t.eventFlow;

  const [flowInstance, setFlowInstance] = useState(null);
  const [order, setOrder] = useState(null);
  const [hasEvent, setHasEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState({});
  const [notification, setNotification] = useState(null);

  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [addingStep, setAddingStep] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPerms(d.user?.permissions ?? {}));
    loadFlow();
  }, [id]);

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
      showNotification(tf.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  async function patchFlow(body) {
    const res = await fetch(`/api/orders/${id}/event-flow`, {
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
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    } finally {
      setAddingStep(false);
    }
  }

  async function handleRemoveStep(stepId) {
    try {
      await patchFlow({ action: 'remove_step', stepId });
      showNotification(tf.notifications.stepDeleted);
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function handleMove(steps, idx, dir) {
    const arr = [...steps];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
    const reordered = arr.map((s, i) => ({ _id: s._id, sortOrder: i }));
    try {
      await patchFlow({ action: 'reorder', steps: reordered });
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function handleStatusChange(stepId, status) {
    try {
      await patchFlow({ action: 'update_status', stepId, status });
      showNotification(tf.notifications.statusUpdated);
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  const inp = {
    padding: '9px 12px', border: '1px solid #dadce0', borderRadius: 8,
    fontSize: 14, fontFamily: "'Google Sans'", outline: 'none', background: '#fff',
    width: '100%', boxSizing: 'border-box',
  };
  const btnPrimary = {
    padding: '9px 20px', background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
  };
  const iconBtn = {
    padding: '4px 8px', background: 'none', border: '1px solid #dadce0',
    borderRadius: 6, cursor: 'pointer', color: '#5f6368', fontSize: 12, fontFamily: "'Google Sans'",
  };

  const steps = flowInstance?.steps || [];
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 48px' }}>
      {/* Back link */}
      <div style={{ marginBottom: 20 }}>
        <Link href={`/orders/${id}`} style={{
          fontFamily: "'Google Sans'", fontSize: 14, color: '#1a73e8', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          {tf.backToOrder}
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 500, color: '#202124', margin: '0 0 4px' }}>
          {tf.title}
        </h2>
        {order && (
          <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: '#5f6368', margin: 0 }}>
            {order.clientName}
            {order.eventDate && ` — ${format(new Date(order.eventDate), 'dd MMM yyyy')}`}
            {order.eventType && (
              <span style={{
                marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: '#e8f0fe', color: '#1a73e8', fontFamily: "'Google Sans'", fontWeight: 500,
              }}>
                {order.eventType}
              </span>
            )}
          </p>
        )}
      </div>

      {/* No event linked yet */}
      {!hasEvent && (
        <div style={{
          background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
          padding: 32, textAlign: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#dadce0" style={{ marginBottom: 12 }}>
            <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
          </svg>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: '#5f6368', margin: 0 }}>
            {tf.noEvent}
          </p>
        </div>
      )}

      {/* No flow steps */}
      {hasEvent && steps.length === 0 && !showAddForm && (
        <div style={{
          background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
          padding: 32, textAlign: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#dadce0" style={{ marginBottom: 12 }}>
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: '#5f6368', margin: '0 0 16px' }}>
            {tf.noFlow}
          </p>
          {perms.manage_flow_templates && (
            <button onClick={() => setShowAddForm(true)} style={btnPrimary}>
              {tf.addStep}
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {hasEvent && steps.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124' }}>
              {tf.progress(completedCount, steps.length)}
            </span>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 13, color: '#5f6368' }}>
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
              {tf.template}: {flowInstance.templateName}
            </p>
          )}
        </div>
      )}

      {/* Steps list */}
      {hasEvent && steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {steps.map((step, idx) => {
            const colors = STATUS_COLORS[step.status] || STATUS_COLORS.pending;
            return (
              <div key={step._id} style={{
                background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
                padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                {/* Step number */}
                <div style={{
                  minWidth: 32, height: 32, borderRadius: '50%',
                  background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, fontFamily: "'Google Sans'" }}>
                    {idx + 1}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: step.description ? 4 : 0 }}>
                    <span style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
                      {step.label}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      background: colors.bg, color: colors.text, fontFamily: "'Google Sans'", fontWeight: 500,
                    }}>
                      {tf.status[step.status] || step.status}
                    </span>
                  </div>
                  {step.description && (
                    <p style={{ fontFamily: "'Google Sans'", fontSize: 13, color: '#5f6368', margin: 0 }}>
                      {step.description}
                    </p>
                  )}

                  {/* Status selector (manager + admin) */}
                  {(perms.update_flow_status || perms.manage_flow_templates) && (
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
                        {['pending', 'in_progress', 'completed', 'skipped'].map(s => (
                          <option key={s} value={s}>{tf.status[s]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Admin controls */}
                {perms.manage_flow_templates && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleMove(steps, idx, -1)} disabled={idx === 0}
                      style={{ ...iconBtn, opacity: idx === 0 ? 0.4 : 1 }} title={tf.moveUp}>↑</button>
                    <button onClick={() => handleMove(steps, idx, 1)} disabled={idx === steps.length - 1}
                      style={{ ...iconBtn, opacity: idx === steps.length - 1 ? 0.4 : 1 }} title={tf.moveDown}>↓</button>
                    <button onClick={() => handleRemoveStep(step._id)}
                      style={{ ...iconBtn, color: '#d93025', borderColor: '#f5c6c4' }} title={tf.deleteStep}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add step button / form (admin only) */}
      {hasEvent && perms.manage_flow_templates && steps.length > 0 && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', background: '#fff', border: '1px dashed #dadce0',
          borderRadius: 10, cursor: 'pointer', fontSize: 14, fontFamily: "'Google Sans'",
          color: '#1a73e8', width: '100%', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          {tf.addStep}
        </button>
      )}

      {hasEvent && perms.manage_flow_templates && showAddForm && (
        <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 20 }}>
          <p style={{ fontFamily: "'Google Sans'", fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5f6368', margin: '0 0 12px' }}>
            {tf.addStep}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              placeholder={tf.stepLabelPlaceholder}
              value={newStepLabel}
              onChange={e => setNewStepLabel(e.target.value)}
              style={inp}
              autoFocus
            />
            <input
              type="text"
              placeholder={tf.stepDescriptionPlaceholder}
              value={newStepDesc}
              onChange={e => setNewStepDesc(e.target.value)}
              style={inp}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAddStep}
                disabled={addingStep || !newStepLabel.trim()}
                style={{ ...btnPrimary, opacity: (!newStepLabel.trim() || addingStep) ? 0.6 : 1 }}
              >
                {tf.addStep}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewStepLabel(''); setNewStepDesc(''); }}
                style={{ padding: '9px 18px', background: 'none', border: '1px solid #dadce0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: "'Google Sans'", color: '#5f6368' }}
              >
                {tf.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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

function Spinner() {
  return (
    <div style={{ width: 36, height: 36, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

interface Step {
  _id: string;
  label: string;
  description?: string;
  sortOrder: number;
}

interface FlowTemplate {
  _id: string;
  name: string;
  eventTypeKey: string;
  isActive: boolean;
  steps?: Step[];
}

interface EventTypeConfig {
  _id: string;
  key: string;
  label: string;
}

interface StepForm {
  newLabel?: string;
  newDesc?: string;
}

interface StepEdit {
  label: string;
  description: string;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function FlowTemplatesSettingsPage() {
  const t = useT();
  const tf = t.flowTemplateSettings;

  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [newName, setNewName] = useState('');
  const [newEventTypeKey, setNewEventTypeKey] = useState('');
  const [adding, setAdding] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [stepForms, setStepForms] = useState<Record<string, StepForm>>({});
  const [stepEdits, setStepEdits] = useState<Record<string, StepEdit>>({});

  useEffect(() => {
    load();
    fetch('/api/event-type-configs')
      .then(r => r.ok ? r.json() : { configs: [] })
      .then(d => setEventTypes(d.configs || []));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/flow-templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      showNotification(tf.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(msg: string, type: 'success' | 'error' = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  async function handleAdd() {
    if (!newName.trim() || !newEventTypeKey) return;
    setAdding(true);
    try {
      const res = await fetch('/api/settings/flow-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), eventTypeKey: newEventTypeKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewName('');
      setNewEventTypeKey('');
      showNotification(tf.notifications.added);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tf.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(tmpl: FlowTemplate) {
    try {
      await fetch(`/api/settings/flow-templates/${tmpl._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tmpl.isActive }),
      });
      setTemplates(ts => ts.map(t => t._id === tmpl._id ? { ...t, isActive: !t.isActive } : t));
    } catch {
      showNotification(tf.notifications.saveFailed, 'error');
    }
  }

  async function handleDelete(tmpl: FlowTemplate) {
    if (!confirm(tf.deleteConfirm(tmpl.name))) return;
    try {
      const res = await fetch(`/api/settings/flow-templates/${tmpl._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      showNotification(tf.notifications.deleted);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tf.notifications.saveFailed, 'error');
    }
  }

  async function patchSteps(templateId: string, steps: Partial<Step>[]) {
    const res = await fetch(`/api/settings/flow-templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }

  async function handleAddStep(tmpl: FlowTemplate) {
    const form = stepForms[tmpl._id] || {};
    if (!form.newLabel?.trim()) return;
    try {
      const maxOrder = (tmpl.steps || []).reduce((m, s) => Math.max(m, s.sortOrder), -1);
      const newSteps = [
        ...(tmpl.steps || []),
        { label: form.newLabel.trim(), description: (form.newDesc || '').trim(), sortOrder: maxOrder + 1 },
      ];
      await patchSteps(tmpl._id, newSteps);
      setStepForms(f => ({ ...f, [tmpl._id]: { newLabel: '', newDesc: '' } }));
      showNotification(tf.notifications.stepAdded);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tf.notifications.saveFailed, 'error');
    }
  }

  async function handleDeleteStep(tmpl: FlowTemplate, stepId: string) {
    try {
      const newSteps = (tmpl.steps || []).filter(s => s._id !== stepId);
      await patchSteps(tmpl._id, newSteps);
      showNotification(tf.notifications.stepDeleted);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tf.notifications.saveFailed, 'error');
    }
  }

  async function handleMoveStep(tmpl: FlowTemplate, idx: number, dir: number) {
    const steps = [...(tmpl.steps || [])];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];
    const reordered = steps.map((s, i) => ({ ...s, sortOrder: i }));
    try {
      await patchSteps(tmpl._id, reordered);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tf.notifications.saveFailed, 'error');
    }
  }

  function startEditStep(step: Step) {
    setStepEdits(e => ({ ...e, [step._id]: { label: step.label, description: step.description || '' } }));
  }

  async function saveEditStep(tmpl: FlowTemplate, step: Step) {
    const edit = stepEdits[step._id];
    if (!edit?.label?.trim()) return;
    try {
      const newSteps = (tmpl.steps || []).map(s =>
        s._id === step._id ? { ...s, label: edit.label.trim(), description: (edit.description || '').trim() } : s
      );
      await patchSteps(tmpl._id, newSteps);
      setStepEdits(e => { const n = { ...e }; delete n[step._id]; return n; });
      showNotification(tf.notifications.updated);
      await load();
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : tf.notifications.saveFailed, 'error');
    }
  }

  function cancelEditStep(stepId: string) {
    setStepEdits(e => { const n = { ...e }; delete n[stepId]; return n; });
  }

  return (
    <div className="max-w-[860px]">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-[#202124] m-0 mb-1.5" style={{ fontFamily: "'Google Sans'" }}>
          {tf.title}
        </h2>
        <p className="text-sm text-[#5f6368] m-0" style={{ fontFamily: "'Google Sans'" }}>
          {tf.subtitle}
        </p>
      </div>

      {/* Add template */}
      <div className="bg-white border border-[#e8eaed] rounded-xl p-5 mb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#5f6368] mb-3.5" style={{ fontFamily: "'Google Sans'" }}>{tf.addNew}</p>
        <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <div>
            <label className={lblCls}>{tf.eventType}</label>
            <select
              value={newEventTypeKey}
              onChange={e => setNewEventTypeKey(e.target.value)}
              className={inpCls}
              style={{ color: newEventTypeKey ? '#202124' : '#9aa0a6' }}
            >
              <option value="">{tf.selectEventType}</option>
              {eventTypes.map(et => (
                <option key={et._id} value={et.key}>{et.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lblCls}>{tf.templateName}</label>
            <input
              type="text"
              placeholder={tf.templateNamePlaceholder}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className={inpCls}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim() || !newEventTypeKey}
            className="py-[9px] px-5 bg-google-blue text-white border-none rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap"
            style={{ fontFamily: "'Google Sans'", opacity: (adding || !newName.trim() || !newEventTypeKey) ? 0.6 : 1 }}
          >
            {adding ? tf.adding : tf.add}
          </button>
        </div>
        <p className="text-xs text-[#9aa0a6] mt-2.5 mb-0" style={{ fontFamily: "'Google Sans'" }}>
          {tf.hint}
        </p>
      </div>

      {/* Template list */}
      <div className="bg-white border border-[#e8eaed] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-[#9aa0a6] text-sm" style={{ fontFamily: "'Google Sans'" }}>{tf.loading}</div>
        ) : templates.length === 0 ? (
          <div className="p-6 text-center text-[#9aa0a6] text-sm" style={{ fontFamily: "'Google Sans'" }}>{tf.noTemplates}</div>
        ) : (
          templates.map((tmpl, tmplIdx) => {
            const isOpen = expanded === tmpl._id;
            const form = stepForms[tmpl._id] || {};
            const etLabel = eventTypes.find(et => et.key === tmpl.eventTypeKey)?.label || tmpl.eventTypeKey;
            const steps = tmpl.steps || [];

            return (
              <div key={tmpl._id} style={{ borderBottom: tmplIdx < templates.length - 1 ? '1px solid #f1f3f4' : 'none' }}>
                {/* Template header row */}
                <div className="flex items-center gap-3" style={{ padding: '14px 20px' }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : tmpl._id)}
                    className="bg-transparent border-none cursor-pointer p-1 text-[#5f6368] flex flex-shrink-0"
                    title={isOpen ? 'Collapse' : 'Expand'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-medium text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>
                      {tmpl.name}
                    </span>
                    <span className="ml-2.5 text-[11px] py-[2px] px-2 rounded-xl bg-[#e8f0fe] text-google-blue font-medium" style={{ fontFamily: "'Google Sans'" }}>
                      {etLabel}
                    </span>
                    <span className="ml-2 text-xs text-[#9aa0a6]" style={{ fontFamily: "'Google Sans'" }}>
                      {steps.length} {tf.stepsTitle.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(tmpl)}
                      className="py-[7px] px-3.5 border rounded-md cursor-pointer text-xs"
                      style={{
                        fontFamily: "'Google Sans'",
                        background: 'none',
                        color: tmpl.isActive ? '#137333' : '#9aa0a6',
                        borderColor: tmpl.isActive ? '#a8d5b5' : '#dadce0',
                        backgroundColor: tmpl.isActive ? '#e6f4ea' : 'transparent',
                      }}
                    >
                      {tmpl.isActive ? tf.active : tf.inactive}
                    </button>
                    <button onClick={() => handleDelete(tmpl)}
                      className="py-[7px] px-3.5 bg-transparent text-google-red border border-[#f5c6c4] rounded-lg cursor-pointer text-[13px]"
                      style={{ fontFamily: "'Google Sans'" }}>
                      {tf.delete}
                    </button>
                  </div>
                </div>

                {/* Expanded steps panel */}
                {isOpen && (
                  <div className="border-t border-[#f1f3f4] bg-[#fafafa]" style={{ padding: '16px 20px 20px' }}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#5f6368] mb-3" style={{ fontFamily: "'Google Sans'" }}>{tf.stepsTitle}</p>

                    {steps.length === 0 ? (
                      <p className="text-[13px] text-[#9aa0a6] mb-4" style={{ fontFamily: "'Google Sans'" }}>{tf.noSteps}</p>
                    ) : (
                      <div className="flex flex-col gap-2 mb-4">
                        {steps.map((step, idx) => {
                          const editing = stepEdits[step._id];
                          return (
                            <div key={step._id}
                              className="bg-white border border-[#e8eaed] rounded-lg flex gap-2.5 items-start"
                              style={{ padding: '10px 14px' }}
                            >
                              <span className="min-w-[24px] h-6 rounded-full bg-[#e8eaed] flex items-center justify-center text-[11px] font-semibold text-[#5f6368] flex-shrink-0" style={{ fontFamily: "'Google Sans'" }}>
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                {editing ? (
                                  <div className="flex flex-col gap-2">
                                    <input
                                      value={editing.label}
                                      onChange={e => setStepEdits(ed => ({ ...ed, [step._id]: { ...ed[step._id], label: e.target.value } }))}
                                      className={`${inpCls} text-[13px]`}
                                    />
                                    <input
                                      value={editing.description}
                                      placeholder={tf.stepDescriptionPlaceholder}
                                      onChange={e => setStepEdits(ed => ({ ...ed, [step._id]: { ...ed[step._id], description: e.target.value } }))}
                                      className={`${inpCls} text-[13px]`}
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => saveEditStep(tmpl, step)}
                                        className="bg-google-blue text-white border-none rounded-lg py-1.5 px-3.5 text-[13px] font-medium cursor-pointer"
                                        style={{ fontFamily: "'Google Sans'" }}>{tf.save}</button>
                                      <button onClick={() => cancelEditStep(step._id)}
                                        className="bg-transparent text-google-blue border border-[#dadce0] rounded-lg py-1.5 px-3.5 text-[13px] cursor-pointer"
                                        style={{ fontFamily: "'Google Sans'" }}>{tf.cancel}</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm font-medium text-[#202124]" style={{ fontFamily: "'Google Sans'" }}>
                                      {step.label}
                                    </div>
                                    {step.description && (
                                      <div className="text-xs text-[#5f6368] mt-0.5" style={{ fontFamily: "'Google Sans'" }}>
                                        {step.description}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              {!editing && (
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <button onClick={() => handleMoveStep(tmpl, idx, -1)} disabled={idx === 0}
                                    className="py-1 px-2 bg-transparent border border-[#dadce0] rounded-md cursor-pointer text-[#5f6368] text-xs"
                                    style={{ opacity: idx === 0 ? 0.4 : 1, fontFamily: "'Google Sans'" }} title={tf.moveUp}>↑</button>
                                  <button onClick={() => handleMoveStep(tmpl, idx, 1)} disabled={idx === steps.length - 1}
                                    className="py-1 px-2 bg-transparent border border-[#dadce0] rounded-md cursor-pointer text-[#5f6368] text-xs"
                                    style={{ opacity: idx === steps.length - 1 ? 0.4 : 1, fontFamily: "'Google Sans'" }} title={tf.moveDown}>↓</button>
                                  <button onClick={() => startEditStep(step)}
                                    className="py-1 px-2 bg-transparent border border-[#dadce0] rounded-md cursor-pointer text-[#5f6368] text-xs"
                                    style={{ fontFamily: "'Google Sans'" }}>{tf.edit}</button>
                                  <button onClick={() => handleDeleteStep(tmpl, step._id)}
                                    className="py-1 px-2 bg-transparent border border-[#f5c6c4] rounded-md cursor-pointer text-google-red text-xs"
                                    style={{ fontFamily: "'Google Sans'" }}>{tf.delete}</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add step form */}
                    <div className="border border-dashed border-[#dadce0] rounded-lg p-3.5 bg-white">
                      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#5f6368] mb-2.5" style={{ fontFamily: "'Google Sans'" }}>{tf.addStep}</p>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder={tf.stepLabelPlaceholder}
                          value={form.newLabel || ''}
                          onChange={e => setStepForms(f => ({ ...f, [tmpl._id]: { ...f[tmpl._id], newLabel: e.target.value } }))}
                          className={`${inpCls} text-[13px]`}
                        />
                        <input
                          type="text"
                          placeholder={tf.stepDescriptionPlaceholder}
                          value={form.newDesc || ''}
                          onChange={e => setStepForms(f => ({ ...f, [tmpl._id]: { ...f[tmpl._id], newDesc: e.target.value } }))}
                          className={`${inpCls} text-[13px]`}
                        />
                        <div>
                          <button
                            onClick={() => handleAddStep(tmpl)}
                            disabled={!form.newLabel?.trim()}
                            className="bg-google-blue text-white border-none rounded-lg py-[7px] px-4 text-[13px] font-medium cursor-pointer"
                            style={{ fontFamily: "'Google Sans'", opacity: !form.newLabel?.trim() ? 0.6 : 1 }}
                          >
                            {tf.addStep}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-2.5 px-5 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', fontFamily: "'Google Sans'", zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,.2)' }}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}

const inpCls = 'py-[9px] px-3 border border-[#dadce0] rounded-lg text-sm outline-none bg-white w-full box-border';
const lblCls = 'text-[11px] font-medium uppercase tracking-[0.04em] text-[#5f6368] block mb-1';

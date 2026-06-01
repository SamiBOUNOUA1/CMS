'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';

export default function FlowTemplatesSettingsPage() {
  const t = useT();
  const tf = t.flowTemplateSettings;

  const [templates, setTemplates] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const [newName, setNewName] = useState('');
  const [newEventTypeKey, setNewEventTypeKey] = useState('');
  const [adding, setAdding] = useState(false);

  // Expanded template id
  const [expanded, setExpanded] = useState(null);

  // Step editing state per template: { [templateId]: { newLabel, newDesc, saving } }
  const [stepForms, setStepForms] = useState({});

  // Inline step edit state: { [stepId]: { label, description } }
  const [stepEdits, setStepEdits] = useState({});

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

  function showNotification(msg, type = 'success') {
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
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(tmpl) {
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

  async function handleDelete(tmpl) {
    if (!confirm(tf.deleteConfirm(tmpl.name))) return;
    try {
      const res = await fetch(`/api/settings/flow-templates/${tmpl._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      showNotification(tf.notifications.deleted);
      await load();
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function patchSteps(templateId, steps) {
    const res = await fetch(`/api/settings/flow-templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }

  async function handleAddStep(tmpl) {
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
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function handleDeleteStep(tmpl, stepId) {
    try {
      const newSteps = tmpl.steps.filter(s => s._id !== stepId);
      await patchSteps(tmpl._id, newSteps);
      showNotification(tf.notifications.stepDeleted);
      await load();
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  async function handleMoveStep(tmpl, idx, dir) {
    const steps = [...(tmpl.steps || [])];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];
    const reordered = steps.map((s, i) => ({ ...s, sortOrder: i }));
    try {
      await patchSteps(tmpl._id, reordered);
      await load();
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  function startEditStep(step) {
    setStepEdits(e => ({ ...e, [step._id]: { label: step.label, description: step.description || '' } }));
  }

  async function saveEditStep(tmpl, step) {
    const edit = stepEdits[step._id];
    if (!edit?.label?.trim()) return;
    try {
      const newSteps = tmpl.steps.map(s =>
        s._id === step._id ? { ...s, label: edit.label.trim(), description: (edit.description || '').trim() } : s
      );
      await patchSteps(tmpl._id, newSteps);
      setStepEdits(e => { const n = { ...e }; delete n[step._id]; return n; });
      showNotification(tf.notifications.updated);
      await load();
    } catch (err) {
      showNotification(err.message || tf.notifications.saveFailed, 'error');
    }
  }

  function cancelEditStep(stepId) {
    setStepEdits(e => { const n = { ...e }; delete n[stepId]; return n; });
  }

  const inp = {
    padding: '9px 12px', border: '1px solid #dadce0', borderRadius: 8,
    fontSize: 14, fontFamily: "'Google Sans'", outline: 'none', background: '#fff',
    width: '100%', boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
    color: '#5f6368', fontFamily: "'Google Sans'", display: 'block', marginBottom: 4,
  };
  const btnPrimary = {
    padding: '9px 20px', background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
    whiteSpace: 'nowrap',
  };
  const btnSecondary = {
    padding: '7px 14px', background: 'none', color: '#1a73e8', border: '1px solid #dadce0',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'Google Sans'",
  };
  const btnDanger = {
    padding: '7px 14px', background: 'none', color: '#d93025', border: '1px solid #f5c6c4',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'Google Sans'",
  };
  const iconBtn = {
    padding: '4px 8px', background: 'none', border: '1px solid #dadce0',
    borderRadius: 6, cursor: 'pointer', color: '#5f6368', fontSize: 12, fontFamily: "'Google Sans'",
  };

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 500, color: '#202124', margin: '0 0 6px' }}>
          {tf.title}
        </h2>
        <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: '#5f6368', margin: 0 }}>
          {tf.subtitle}
        </p>
      </div>

      {/* Add template */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <p style={{ ...lbl, marginBottom: 14, fontSize: 12 }}>{tf.addNew}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={lbl}>{tf.eventType}</label>
            <select
              value={newEventTypeKey}
              onChange={e => setNewEventTypeKey(e.target.value)}
              style={{ ...inp, color: newEventTypeKey ? '#202124' : '#9aa0a6' }}
            >
              <option value="">{tf.selectEventType}</option>
              {eventTypes.map(et => (
                <option key={et._id} value={et.key}>{et.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>{tf.templateName}</label>
            <input
              type="text"
              placeholder={tf.templateNamePlaceholder}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={inp}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim() || !newEventTypeKey}
            style={{ ...btnPrimary, opacity: (adding || !newName.trim() || !newEventTypeKey) ? 0.6 : 1 }}
          >
            {adding ? tf.adding : tf.add}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#9aa0a6', margin: '10px 0 0', fontFamily: "'Google Sans'" }}>
          {tf.hint}
        </p>
      </div>

      {/* Template list */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9aa0a6', fontFamily: "'Google Sans'", fontSize: 14 }}>
            {tf.loading}
          </div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#9aa0a6', fontFamily: "'Google Sans'", fontSize: 14 }}>
            {tf.noTemplates}
          </div>
        ) : (
          templates.map((tmpl, tmplIdx) => {
            const isOpen = expanded === tmpl._id;
            const form = stepForms[tmpl._id] || {};
            const etLabel = eventTypes.find(et => et.key === tmpl.eventTypeKey)?.label || tmpl.eventTypeKey;
            const steps = tmpl.steps || [];

            return (
              <div key={tmpl._id} style={{ borderBottom: tmplIdx < templates.length - 1 ? '1px solid #f1f3f4' : 'none' }}>
                {/* Template header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : tmpl._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5f6368', display: 'flex', flexShrink: 0 }}
                    title={isOpen ? 'Collapse' : 'Expand'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
                      {tmpl.name}
                    </span>
                    <span style={{
                      marginLeft: 10, fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      background: '#e8f0fe', color: '#1a73e8', fontFamily: "'Google Sans'", fontWeight: 500,
                    }}>
                      {etLabel}
                    </span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#9aa0a6', fontFamily: "'Google Sans'" }}>
                      {steps.length} {tf.stepsTitle.toLowerCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggleActive(tmpl)}
                      style={{
                        ...iconBtn,
                        color: tmpl.isActive ? '#137333' : '#9aa0a6',
                        borderColor: tmpl.isActive ? '#a8d5b5' : '#dadce0',
                        background: tmpl.isActive ? '#e6f4ea' : 'none',
                      }}
                    >
                      {tmpl.isActive ? tf.active : tf.inactive}
                    </button>
                    <button onClick={() => handleDelete(tmpl)} style={btnDanger}>
                      {tf.delete}
                    </button>
                  </div>
                </div>

                {/* Expanded steps panel */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f1f3f4', background: '#fafafa', padding: '16px 20px 20px' }}>
                    <p style={{ ...lbl, marginBottom: 12 }}>{tf.stepsTitle}</p>

                    {steps.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9aa0a6', fontFamily: "'Google Sans'", marginBottom: 16 }}>
                        {tf.noSteps}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {steps.map((step, idx) => {
                          const editing = stepEdits[step._id];
                          return (
                            <div key={step._id}
                              style={{
                                background: '#fff', border: '1px solid #e8eaed', borderRadius: 8,
                                padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
                              }}
                            >
                              <span style={{
                                minWidth: 24, height: 24, borderRadius: '50%', background: '#e8eaed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 600, color: '#5f6368', fontFamily: "'Google Sans'", flexShrink: 0,
                              }}>
                                {idx + 1}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {editing ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <input
                                      value={editing.label}
                                      onChange={e => setStepEdits(ed => ({ ...ed, [step._id]: { ...ed[step._id], label: e.target.value } }))}
                                      style={{ ...inp, fontSize: 13 }}
                                    />
                                    <input
                                      value={editing.description}
                                      placeholder={tf.stepDescriptionPlaceholder}
                                      onChange={e => setStepEdits(ed => ({ ...ed, [step._id]: { ...ed[step._id], description: e.target.value } }))}
                                      style={{ ...inp, fontSize: 13 }}
                                    />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button onClick={() => saveEditStep(tmpl, step)} style={{ ...btnPrimary, padding: '6px 14px', fontSize: 13 }}>{tf.save}</button>
                                      <button onClick={() => cancelEditStep(step._id)} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 13 }}>{tf.cancel}</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ fontFamily: "'Google Sans'", fontSize: 14, color: '#202124', fontWeight: 500 }}>
                                      {step.label}
                                    </div>
                                    {step.description && (
                                      <div style={{ fontFamily: "'Google Sans'", fontSize: 12, color: '#5f6368', marginTop: 2 }}>
                                        {step.description}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              {!editing && (
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  <button onClick={() => handleMoveStep(tmpl, idx, -1)} disabled={idx === 0} style={{ ...iconBtn, opacity: idx === 0 ? 0.4 : 1 }} title={tf.moveUp}>↑</button>
                                  <button onClick={() => handleMoveStep(tmpl, idx, 1)} disabled={idx === steps.length - 1} style={{ ...iconBtn, opacity: idx === steps.length - 1 ? 0.4 : 1 }} title={tf.moveDown}>↓</button>
                                  <button onClick={() => startEditStep(step)} style={iconBtn}>{tf.edit}</button>
                                  <button onClick={() => handleDeleteStep(tmpl, step._id)} style={{ ...iconBtn, color: '#d93025', borderColor: '#f5c6c4' }}>{tf.delete}</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add step form */}
                    <div style={{ border: '1px dashed #dadce0', borderRadius: 8, padding: 14, background: '#fff' }}>
                      <p style={{ ...lbl, marginBottom: 10 }}>{tf.addStep}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          type="text"
                          placeholder={tf.stepLabelPlaceholder}
                          value={form.newLabel || ''}
                          onChange={e => setStepForms(f => ({ ...f, [tmpl._id]: { ...f[tmpl._id], newLabel: e.target.value } }))}
                          style={{ ...inp, fontSize: 13 }}
                        />
                        <input
                          type="text"
                          placeholder={tf.stepDescriptionPlaceholder}
                          value={form.newDesc || ''}
                          onChange={e => setStepForms(f => ({ ...f, [tmpl._id]: { ...f[tmpl._id], newDesc: e.target.value } }))}
                          style={{ ...inp, fontSize: 13 }}
                        />
                        <div>
                          <button
                            onClick={() => handleAddStep(tmpl)}
                            disabled={!form.newLabel?.trim()}
                            style={{ ...btnPrimary, padding: '7px 16px', fontSize: 13, opacity: !form.newLabel?.trim() ? 0.6 : 1 }}
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

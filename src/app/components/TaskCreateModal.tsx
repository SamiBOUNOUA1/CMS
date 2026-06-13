'use client';

import { useState, useEffect } from 'react';
import { Field, FormInput, FormSelect, btnFilled, btnOutline } from './FormPrimitives';
import { useT } from '@/lib/LanguageContext';

interface TaskForm {
  type: string;
  scheduledDate: string;
  completed: boolean;
  owner: string;
  notes: string;
}

interface AppUser {
  _id?: string;
  id?: string;
  name: string;
  role: string;
}

interface ListUser {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function TaskCreateModal({ open, onClose, onCreated }: TaskCreateModalProps) {
  const t = useT();
  const tm = t.taskModal;
  const tt = t.tasksPage;

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<ListUser[]>([]);
  const [form, setForm] = useState<TaskForm>({ type: 'call', scheduledDate: '', completed: false, owner: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const user: AppUser = data.user;
        setCurrentUser(user);
        setForm(f => ({ ...f, owner: user._id ?? user.id ?? '' }));
        if (user.role === 'admin') {
          fetch('/api/admin/users')
            .then(r => r.ok ? r.json() : null)
            .then(d => d && setUsers(d.users ?? []));
        }
      })
      .catch(() => {});
  }, [open]);

  const set = (k: keyof TaskForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleClose = () => {
    setForm({ type: 'call', scheduledDate: '', completed: false, owner: currentUser?._id ?? currentUser?.id ?? '', notes: '' });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.scheduledDate) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        scheduledDate: form.scheduledDate,
        completed: form.completed,
        notes: form.notes,
      };
      if (currentUser?.role === 'admin' && form.owner) body.owner = form.owner;

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      handleClose();
      onCreated();
    } catch {
      // error handled by parent via onCreated not being called
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-g-surface rounded-2xl p-6 sm:p-7 max-w-[480px] w-[90%] shadow-google-2"
      >
        <h2 className="m-0 mb-5 font-sans text-lg font-medium text-g-text">
          {tm.titleCreate}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <Field label={tm.type}>
              <FormSelect value={form.type} onChange={e => set('type', e.target.value)} required>
                <option value="call">{tt?.types?.call ?? 'Call'}</option>
                <option value="message">{tt?.types?.message ?? 'Message'}</option>
                <option value="other">{tt?.types?.other ?? 'Other'}</option>
              </FormSelect>
            </Field>

            <Field label={tm.scheduledDate}>
              <FormInput
                type="date"
                value={form.scheduledDate}
                onChange={e => set('scheduledDate', e.target.value)}
                required
              />
            </Field>

            <Field label={tm.notes}>
              <FormInput
                type="text"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder={tm.notes}
              />
            </Field>

            {currentUser?.role === 'admin' && users.length > 0 && (
              <Field label={tm.owner}>
                <FormSelect value={form.owner} onChange={e => set('owner', e.target.value)}>
                  {users.filter(u => u.isActive !== false).map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </FormSelect>
              </Field>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-g-text font-sans">
              <button
                type="button"
                onClick={() => set('completed', !form.completed)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 p-0 cursor-pointer"
                style={{
                  border: `2px solid ${form.completed ? '#137333' : '#5f6368'}`,
                  background: form.completed ? '#137333' : 'transparent',
                }}
              >
                {form.completed && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </button>
              {tm.completed}
            </label>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button type="button" onClick={handleClose} className={btnOutline}>
              {tm.cancel}
            </button>
            <button type="submit" disabled={saving} className={btnFilled}>
              {saving ? tm.creating : tm.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

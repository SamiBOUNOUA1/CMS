'use client';

import { useState, useCallback } from 'react';
import { Field, FormInput, FormSelect } from './FormPrimitives';
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

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function TaskFloatingButton() {
  const t = useT();
  const tm = t.taskModal;
  const tt = t.tasksPage;

  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<ListUser[]>([]);
  const [form, setForm] = useState<TaskForm>({ type: 'call', scheduledDate: '', completed: false, owner: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const openModal = useCallback(async () => {
    setShowModal(true);
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      const user: AppUser = data.user;
      setCurrentUser(user);
      setForm(f => ({ ...f, owner: user._id ?? user.id ?? '' }));

      if (user.role === 'admin') {
        const uRes = await fetch('/api/admin/users');
        if (uRes.ok) {
          const uData = await uRes.json();
          setUsers(uData.users ?? []);
        }
      }
    } catch {}
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setForm({ type: 'call', scheduledDate: '', completed: false, owner: currentUser?._id ?? currentUser?.id ?? '', notes: '' });
  };

  const set = (k: keyof TaskForm, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

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
      showNotif(tm.created);
      closeModal();
    } catch {
      showNotif(tm.createFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={openModal}
        aria-label={tm.titleCreate}
        className="no-print fixed bottom-6 right-6 z-[199] w-14 h-14 rounded-full bg-google-blue text-white border-none flex items-center justify-center text-3xl font-light font-sans cursor-pointer"
        style={{ boxShadow: '0 4px 12px rgba(26,115,232,.4)' }}
      >
        +
      </button>

      {/* Modal */}
      {showModal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-g-surface rounded-2xl p-7 max-w-[480px] w-[90%]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}
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

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-g-text font-[Roboto,Arial]">
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
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-transparent text-g-text-2 border border-g-border rounded-full py-2.5 px-5 text-sm font-sans font-medium cursor-pointer"
                >
                  {tm.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-white border-none rounded-full py-2.5 px-6 text-sm font-sans font-medium"
                  style={{ background: saving ? '#ccc' : '#1a73e8', cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? tm.creating : tm.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {notification && (
        <div
          className="fixed bottom-24 right-6 z-[1000] text-white rounded-lg px-4 py-3 text-sm font-[Roboto,Arial]"
          style={{
            background: notification.type === 'error' ? '#d93025' : '#202124',
            boxShadow: '0 4px 12px rgba(0,0,0,.2)',
          }}
        >
          {notification.msg}
        </div>
      )}
    </>
  );
}

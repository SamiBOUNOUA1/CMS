'use client';

import { useState, useEffect, useCallback } from 'react';
import { useT } from '@/lib/LanguageContext';
import { useIsMobile } from '@/lib/useIsMobile';
import { format } from 'date-fns';
import { btnFilled } from '@/app/components/FormPrimitives';
import TaskCreateModal from '@/app/components/TaskCreateModal';

interface Task {
  _id: string; type: string; notes?: string; scheduledDate: string;
  completed: boolean; owner?: { name: string };
}

function getDeadlineStyle(task: Task): React.CSSProperties {
  if (task.completed) return {};
  const now = Date.now();
  const due = new Date(task.scheduledDate).getTime();
  const oneDay = 86400000;
  if (due < now) return { background: '#fce8e6', borderLeft: '3px solid #d93025' };
  if (due - now <= oneDay) return { background: '#fef7e0', borderLeft: '3px solid #f9ab00' };
  return {};
}

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

export default function TasksPage() {
  const t = useT();
  const tp = t.tasksPage;
  const tm = t.taskModal;
  const isMobile = useIsMobile(640);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const showNotif = (msg: string, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      showNotif(tp.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => d && setCurrentUser(d.user));
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleComplete = useCallback(async (taskId: string, current: boolean) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: !current } : t));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !current }),
      });
      if (!res.ok) throw new Error();
      showNotif(tp.updated);
    } catch {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: current } : t));
      showNotif(tp.updateFailed, 'error');
    }
  }, [tp.updated, tp.updateFailed]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setTasks(prev => prev.filter(t => t._id !== id));
      showNotif(tp.deleted);
    } catch {
      showNotif(tp.deleteFailed, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const typeLabel = (type: string) => tp.types?.[type] ?? type;
  const pendingTasks = tasks.filter(t => !t.completed);

  return (
    <div className="max-w-[960px] mx-auto px-3 py-5 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-medium text-g-text m-0">{tp.title}</h1>
          {!loading && (
            <p className="mt-1 mb-0 text-[13px] text-g-text-2">{tp.taskCount(pendingTasks.length)}</p>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className={btnFilled}>
          + {tm.titleCreate}
        </button>
      </div>

      <TaskCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); fetchTasks(); showNotif(tm.created); }}
      />

      {loading && <div className="text-[#9aa0a6] text-sm py-5">…</div>}

      {!loading && pendingTasks.length === 0 && (
        <div className="text-center py-12 px-6 bg-g-surface border border-g-border rounded-xl">
          <p className="text-base font-medium text-[#202124] mb-2">{tp.empty.title}</p>
          <p className="text-sm text-[#9aa0a6] m-0">{tp.empty.body}</p>
        </div>
      )}

      {!loading && pendingTasks.length > 0 && (
        isMobile ? (
          <div className="flex flex-col gap-2.5">
            {pendingTasks.map(task => {
              const dlStyle = getDeadlineStyle(task);
              return (
                <div key={task._id} className="bg-g-surface border border-g-border rounded-xl p-3.5" style={dlStyle}>
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleComplete(task._id, task.completed)}
                      className="w-5 h-5 rounded flex-shrink-0 p-0 mt-0.5 flex items-center justify-center cursor-pointer"
                      style={{ border: `2px solid ${task.completed ? '#137333' : '#5f6368'}`, background: task.completed ? '#137333' : 'transparent' }}
                    >
                      {task.completed && <CheckIcon />}
                    </button>
                    <div className="flex-1">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-google-blue mb-1">{typeLabel(task.type)}</div>
                      {task.notes && (
                        <div className="text-sm mb-1" style={{ color: task.completed ? '#9aa0a6' : '#202124', textDecoration: task.completed ? 'line-through' : 'none' }}>
                          {task.notes}
                        </div>
                      )}
                      <div className="text-xs text-[#5f6368]">{format(new Date(task.scheduledDate), 'dd MMM yyyy')}</div>
                      {isAdmin && task.owner && <div className="text-xs text-[#9aa0a6] mt-0.5">{task.owner.name}</div>}
                    </div>
                    <button onClick={() => setDeleteId(task._id)} className="bg-transparent border-none cursor-pointer text-google-red p-1 flex-shrink-0">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-g-surface border border-g-border rounded-xl overflow-hidden">
            <div className="flex py-2.5 px-5 bg-g-bg border-b border-g-border">
              <div className="w-7 flex-shrink-0" />
              <div className="flex-1 text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">{tp.table.type}</div>
              <div className="flex-[2] text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">{tp.table.notes}</div>
              <div className="flex-1 text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">{tp.table.scheduledDate}</div>
              {isAdmin && <div className="flex-1 text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">{tp.table.owner}</div>}
              <div className="flex-1 text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">{tp.table.status}</div>
              <div className="w-10 flex-shrink-0" />
            </div>
            {pendingTasks.map((task, idx) => {
              const dlStyle = getDeadlineStyle(task);
              return (
                <div
                  key={task._id}
                  className="flex items-center gap-3 px-5 py-3 bg-g-surface"
                  style={{ borderBottom: idx === pendingTasks.length - 1 ? 'none' : '1px solid var(--google-border)', ...dlStyle }}
                >
                  <button
                    onClick={() => handleToggleComplete(task._id, task.completed)}
                    className="w-5 h-5 rounded flex-shrink-0 p-0 flex items-center justify-center cursor-pointer"
                    style={{ border: `2px solid ${task.completed ? '#137333' : '#5f6368'}`, background: task.completed ? '#137333' : 'transparent' }}
                    title={task.completed ? tp.statusCompleted : tp.statusPending}
                  >
                    {task.completed && <CheckIcon />}
                  </button>
                  <div className="flex-1 text-[13px]">
                    <span className="bg-[#e8f0fe] text-google-blue rounded-xl py-0.5 px-2.5 text-xs font-medium">{typeLabel(task.type)}</span>
                  </div>
                  <div className="flex-[2] text-sm overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: task.completed ? '#9aa0a6' : '#202124', textDecoration: task.completed ? 'line-through' : 'none' }}>
                    {task.notes || '—'}
                  </div>
                  <div className="flex-1 text-[13px] text-[#5f6368]">{format(new Date(task.scheduledDate), 'dd MMM yyyy')}</div>
                  {isAdmin && <div className="flex-1 text-[13px] text-[#5f6368]">{task.owner?.name ?? '—'}</div>}
                  <div className="flex-1 text-xs font-medium">
                    {task.completed ? <span className="text-[#137333]">{tp.statusCompleted}</span> : <span className="text-[#5f6368]">{tp.statusPending}</span>}
                  </div>
                  <button onClick={() => setDeleteId(task._id)} className="w-8 bg-transparent border-none cursor-pointer text-google-red p-1 flex items-center justify-center flex-shrink-0" title={tp.deleteDialog.delete}>
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center">
          <div className="bg-g-surface rounded-2xl p-7 max-w-[400px] w-[90%] shadow-google-2">
            <h3 className="text-base font-medium text-[#202124] mb-2.5">{tp.deleteDialog.title}</h3>
            <p className="text-sm text-[#5f6368] mb-6">{tp.deleteDialog.body}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="bg-transparent text-[#5f6368] border border-[#dadce0] rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer">{tp.deleteDialog.cancel}</button>
              <button onClick={() => handleDelete(deleteId)} className="bg-google-red text-white border-none rounded-full py-2.5 px-5 text-sm font-medium cursor-pointer">{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-6 right-6 z-[1000] text-white rounded-lg py-3 px-[18px] text-sm shadow-google-2" style={{ background: notification.type === 'error' ? '#d93025' : '#202124' }}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}

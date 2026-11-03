'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { format } from '@/lib/dateFormat';
import { ACTION_LABELS, ActivityIcon } from '@/lib/activityHelpers';
import { formatMoneyOrDash } from '@/lib/money';
import { Skeleton, SkeletonList } from '@/app/components/Skeleton';

const formatCurrency = (n: number | null | undefined, cur = '€') => formatMoneyOrDash(n, cur, 0);

interface ReportKpis {
  revenueThisMonth: number;
  orderCount: number;
  outstanding: number;
}

interface Task {
  _id: string;
  type: string;
  scheduledDate: string;
  completed: boolean;
  notes?: string;
}

interface User {
  name: string;
  permissions?: Record<string, boolean>;
}

interface ActivityEntry {
  _id: string;
  action: string;
  entityLabel: string;
  performedBy?: { name: string } | null;
  createdAt: string;
}

function getDeadlineClass(task: Task): string {
  if (task.completed) return '';
  const now = Date.now();
  const due = new Date(task.scheduledDate).getTime();
  const oneDay = 86400000;
  if (due < now) return 'bg-google-red-light border-l-[3px] border-l-google-red';
  if (due - now <= oneDay) return 'bg-google-yellow-light border-l-[3px] border-l-google-yellow';
  return '';
}

export default function HomePage() {
  const t = useT();
  const tp = t.homePage;
  const tt = t.tasksPage;
  const tr = t.reportsPage;
  const currency = useCurrency();

  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [canViewActivities, setCanViewActivities] = useState(false);
  const [reportKpis, setReportKpis] = useState<ReportKpis | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setUser(d.user);
          if (d.user?.permissions?.view_activities) {
            setCanViewActivities(true);
            fetch('/api/activities?limit=10')
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                if (data) setActivities(data.activities ?? []);
                setLoadingActivities(false);
              })
              .catch(() => setLoadingActivities(false));
          } else {
            setLoadingActivities(false);
          }
          if (d.user?.permissions?.view_reports) {
            fetch('/api/reports?range=12m')
              .then(r => r.ok ? r.json() : null)
              .then(rep => {
                if (rep) {
                  const months = rep.revenueByMonth ?? [];
                  setReportKpis({
                    revenueThisMonth: months.length ? months[months.length - 1].revenue : 0,
                    orderCount: rep.kpis?.orderCount ?? 0,
                    outstanding: rep.paymentsSummary?.outstanding ?? 0,
                  });
                }
              })
              .catch(() => {});
          }
        }
      });
  }, []);

  useEffect(() => {
    fetch('/api/tasks?limit=5')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setTasks(d.tasks ?? []);
        setLoadingTasks(false);
      })
      .catch(() => setLoadingTasks(false));
  }, []);

  const handleToggleComplete = useCallback(async (taskId: string, current: boolean) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: !current } : t));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !current }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: current } : t));
    }
  }, []);

  const now = Date.now();
  const upcoming = tasks.filter(t => !t.completed && new Date(t.scheduledDate).getTime() >= now).length;
  const overdue  = tasks.filter(t => !t.completed && new Date(t.scheduledDate).getTime() < now).length;
  const done     = tasks.filter(t => t.completed).length;

  const typeLabel = (type: string) => tt.types?.[type] ?? type;

  const statCards = [
    { label: tp.stats?.upcoming,  count: upcoming, color: '#1a73e8' },
    { label: tp.stats?.overdue,   count: overdue,  color: '#d93025' },
    { label: tp.stats?.completed, count: done,     color: '#137333' },
  ];

  return (
    <div className={`mx-auto px-6 py-8 ${canViewActivities ? 'max-w-[1280px] grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start' : 'max-w-[960px]'}`}>
      {/* Left column — greeting, stats, tasks */}
      <div>
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-sans text-[26px] font-normal text-g-text m-0">
            {user ? tp.greeting(user.name) : <Skeleton className="h-7 w-64 max-w-full" />}
          </h1>
          <p className="mt-1.5 mb-0 text-[13px] text-g-text-2 font-[Roboto,Arial]">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>

        {/* Business KPI strip (reports permission only) */}
        {reportKpis && (
          <div className="flex gap-4 flex-wrap mb-8">
            <Link href="/reports" className="flex-[1_1_160px] bg-g-surface border border-g-border rounded-xl px-5 py-4 no-underline">
              <div className="font-sans text-[22px] font-medium text-google-blue">{formatCurrency(reportKpis.revenueThisMonth, currency)}</div>
              <div className="text-[13px] text-g-text-2 font-[Roboto,Arial] mt-1">{tr.home.revenueThisMonth}</div>
            </Link>
            <Link href="/reports" className="flex-[1_1_160px] bg-g-surface border border-g-border rounded-xl px-5 py-4 no-underline">
              <div className="font-sans text-[22px] font-medium" style={{ color: '#9334e6' }}>{reportKpis.orderCount}</div>
              <div className="text-[13px] text-g-text-2 font-[Roboto,Arial] mt-1">{tr.home.orders12m}</div>
            </Link>
            <Link href="/reports" className="flex-[1_1_160px] bg-g-surface border border-g-border rounded-xl px-5 py-4 no-underline">
              <div className="font-sans text-[22px] font-medium text-google-red">{formatCurrency(reportKpis.outstanding, currency)}</div>
              <div className="text-[13px] text-g-text-2 font-[Roboto,Arial] mt-1">{tr.home.outstanding}</div>
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-4 flex-wrap mb-8">
          {statCards.map(card => (
            <div
              key={card.label}
              className="flex-[1_1_140px] bg-g-surface border border-g-border rounded-xl px-5 py-4"
            >
              <div className="font-sans text-[28px] font-medium" style={{ color: card.color }}>
                {card.count}
              </div>
              <div className="text-[13px] text-g-text-2 font-[Roboto,Arial] mt-1">
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* My Tasks widget */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-sans text-[17px] font-medium text-g-text m-0">{tp.myTasks}</h2>
            <Link href="/tasks" className="text-[13px] text-google-blue no-underline font-[Roboto,Arial]">
              {tp.viewAll} →
            </Link>
          </div>

          {loadingTasks && <SkeletonList rows={3} />}

          {!loadingTasks && tasks.length === 0 && (
            <div className="text-g-text-3 text-sm font-[Roboto,Arial] py-3">{tp.noTasks}</div>
          )}

          {!loadingTasks && tasks.map(task => (
            <div
              key={task._id}
              className={`flex items-center gap-3 bg-g-surface border border-g-border rounded-[10px] px-4 py-3 mb-2 ${getDeadlineClass(task)}`}
            >
              {/* Status toggle */}
              <button
                onClick={() => handleToggleComplete(task._id, task.completed)}
                className="w-5 h-5 rounded flex-shrink-0 p-0 flex items-center justify-center cursor-pointer"
                style={{
                  border: `2px solid ${task.completed ? 'var(--google-green)' : 'var(--google-text-secondary)'}`,
                  background: task.completed ? 'var(--google-green)' : 'transparent',
                }}
                title={task.completed ? tt.statusCompleted : tt.statusPending}
                aria-label={task.completed ? tt.statusCompleted : tt.statusPending}
              >
                {task.completed && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                )}
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-google-blue font-sans">
                    {typeLabel(task.type)}
                  </span>
                  {task.notes && (
                    <span className={`text-[13px] font-[Roboto,Arial] ${task.completed ? 'text-g-text-3 line-through' : 'text-g-text'}`}>
                      {task.notes}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="text-xs text-g-text-2 font-[Roboto,Arial] flex-shrink-0">
                {format(new Date(task.scheduledDate), 'dd MMM yyyy')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — Recent Activity (admin only) */}
      {canViewActivities && (
        <div className="lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-sans text-[17px] font-medium text-g-text m-0">{tp.recentActivity}</h2>
            <Link href="/activities" className="text-[13px] text-google-blue no-underline font-[Roboto,Arial]">
              {tp.viewAllActivity} →
            </Link>
          </div>

          <div className="bg-g-surface border border-g-border rounded-xl overflow-hidden">
            {loadingActivities && <SkeletonList rows={5} card={false} />}

            {!loadingActivities && activities.length === 0 && (
              <div className="px-4 py-6 text-center text-g-text-3 text-[13px] font-[Roboto,Arial]">
                {tp.noActivity}
              </div>
            )}

            {!loadingActivities && activities.map((a, idx) => (
              <div
                key={a._id}
                className={`flex items-start gap-3 px-4 py-3 ${idx < activities.length - 1 ? 'border-b border-g-border' : ''}`}
              >
                <span className="text-g-text-2 mt-0.5 flex-shrink-0">
                  <ActivityIcon action={a.action} />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-g-text leading-tight truncate">
                    {t.activityPage.actions[a.action] ?? ACTION_LABELS[a.action] ?? a.action}
                  </div>
                  {a.entityLabel && (
                    <div className="text-[12px] text-g-text-2 font-[Roboto,Arial] truncate mt-0.5">
                      {a.entityLabel}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-g-text-3 font-[Roboto,Arial] flex-shrink-0 text-right leading-tight">
                  {format(new Date(a.createdAt), 'dd MMM')}
                  <div>{format(new Date(a.createdAt), 'HH:mm')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

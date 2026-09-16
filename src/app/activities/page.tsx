'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ACTION_LABELS, ActivityIcon } from '@/lib/activityHelpers';

interface ActivityEntry {
  _id: string;
  action: string;
  entityType: string;
  entityLabel: string;
  performedBy?: { name: string } | null;
  createdAt: string;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/activities?page=${page}&limit=${LIMIT}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setActivities(data.activities ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0">Activity Log</h1>
        {total > 0 && !loading && (
          <span className="text-[13px] text-g-text-2 font-[Roboto,Arial]">
            {total} {total === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[56px] bg-g-surface border border-g-border rounded-[10px] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-center py-16 text-g-text-3 text-[14px] font-[Roboto,Arial]">
          No activity recorded yet.
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="space-y-2">
          {activities.map(a => (
            <div
              key={a._id}
              className="flex items-center gap-3 bg-g-surface border border-g-border rounded-[10px] px-4 py-3"
            >
              <span className="text-g-text-2">
                <ActivityIcon action={a.action} />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[13px] font-medium text-g-text font-sans flex-shrink-0">
                    {ACTION_LABELS[a.action] ?? a.action}
                  </span>
                  {a.entityLabel && (
                    <span className="text-[13px] text-g-text-2 font-[Roboto,Arial] truncate">
                      {a.entityLabel}
                    </span>
                  )}
                </div>
                {a.performedBy?.name && (
                  <div className="text-[11px] text-g-text-3 font-[Roboto,Arial] mt-0.5">
                    {a.performedBy.name}
                  </div>
                )}
              </div>

              <div className="text-[12px] text-g-text-3 font-[Roboto,Arial] flex-shrink-0 text-right">
                {format(new Date(a.createdAt), 'dd MMM yyyy')}
                <div className="text-[11px]">{format(new Date(a.createdAt), 'HH:mm')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-1.5 text-[13px] font-[Roboto,Arial] text-google-blue border border-g-border rounded-[6px] bg-g-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-g-hover cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-[13px] text-g-text-2 font-[Roboto,Arial]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-1.5 text-[13px] font-[Roboto,Arial] text-google-blue border border-g-border rounded-[6px] bg-g-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-g-hover cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

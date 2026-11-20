import { CASE_STATUS_COLORS, CASE_PRIORITY_COLORS, type CaseStatus, type CasePriority } from '@/lib/supportCases';

export function CaseStatusBadge({ status, label }: { status: CaseStatus; label?: string }) {
  const [bg, fg] = CASE_STATUS_COLORS[status] || CASE_STATUS_COLORS.open;
  return (
    <span className="rounded-full py-0.5 px-2.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: bg, color: fg }}>
      {label || status}
    </span>
  );
}

export function CasePriorityLabel({ priority, label }: { priority: CasePriority; label?: string }) {
  const color = CASE_PRIORITY_COLORS[priority] || CASE_PRIORITY_COLORS.normal;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap" style={{ color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label || priority}
    </span>
  );
}

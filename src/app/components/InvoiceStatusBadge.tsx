const COLORS: Record<string, [string, string]> = {
  issued: ['var(--google-bg)', 'var(--google-text-secondary)'],
  partially_paid: ['var(--google-yellow-light)', 'var(--google-yellow)'],
  paid: ['var(--google-green-light)', 'var(--google-green)'],
  cancelled: ['var(--google-red-light, #fce8e6)', 'var(--google-red)'],
};

export default function InvoiceStatusBadge({ status, label }: { status: string; label?: string }) {
  const [bg, fg] = COLORS[status] || COLORS.issued;
  return (
    <span className="rounded-full py-0.5 px-2.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: bg, color: fg }}>
      {label || status}
    </span>
  );
}

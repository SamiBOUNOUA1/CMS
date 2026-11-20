'use client';

// Footer for server-paginated lists: page-size picker, "1–25 of 340" range,
// and previous / numbered / next page buttons. Pair with usePagination().

import { useT } from '@/lib/LanguageContext';
import { PAGE_SIZES } from '@/lib/pagination';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

/** Page numbers to show: first, last, current ±1, with null for gaps. */
function pageList(page: number, totalPages: number): (number | null)[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

const navBtn =
  'inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full border-none bg-transparent text-[13px] text-g-text-2 cursor-pointer hover:bg-[var(--google-row-hover)] disabled:opacity-40 disabled:cursor-not-allowed';

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, className = '' }: Props) {
  const tp = useT().pagination;
  if (total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const go = (p: number) => {
    onPageChange(Math.min(totalPages, Math.max(1, p)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between gap-3 flex-wrap mt-4 text-[13px] text-g-text-2 ${className}`}
    >
      <label className="flex items-center gap-2">
        <span>{tp.perPage}</span>
        <select
          value={pageSize}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPageSizeChange(Number(e.target.value))}
          className="border border-g-border rounded-md py-1 px-2 text-[13px] text-g-text bg-g-surface cursor-pointer outline-none"
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <div className="flex items-center gap-1">
        <span className="me-2 whitespace-nowrap">{tp.range(from, to, total)}</span>
        <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label={tp.prev} title={tp.prev} className={navBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
        </button>
        <div className="hidden sm:flex items-center gap-0.5">
          {pageList(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-g-text-3">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-label={tp.page(p)}
                aria-current={p === page ? 'page' : undefined}
                className={navBtn}
                style={p === page ? { background: 'var(--google-blue-light)', color: 'var(--google-blue)', fontWeight: 500 } : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>
        <button type="button" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label={tp.next} title={tp.next} className={navBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
        </button>
      </div>
    </nav>
  );
}

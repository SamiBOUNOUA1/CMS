'use client';

import { useState, useCallback } from 'react';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from '@/lib/pagination';

function readStoredSize(storageKey: string): number {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
  try {
    const n = Number(window.localStorage.getItem(storageKey));
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/**
 * Page + page-size state for a server-paginated list.
 *
 *   const pg = usePagination('orders', [statusFilter, search]);
 *   fetch(`/api/orders?page=${pg.page}&limit=${pg.pageSize}`)
 *   <Pagination {...pg.props} total={total} />
 *
 * The page snaps back to 1 whenever a value in `resetOn` changes (filters,
 * search, sort), without an extra render cycle. The chosen page size is
 * remembered per list in localStorage.
 */
export function usePagination(listKey: string, resetOn: unknown[] = []) {
  const storageKey = `pageSize:${listKey}`;
  const filterKey = JSON.stringify(resetOn);
  const [pageSize, setPageSizeState] = useState(() => readStoredSize(storageKey));
  const [state, setState] = useState({ filterKey, page: 1 });
  const page = state.filterKey === filterKey ? state.page : 1;

  const setPage = useCallback((p: number) => {
    setState({ filterKey, page: Math.max(1, p) });
  }, [filterKey]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setState({ filterKey, page: 1 });
    try { window.localStorage.setItem(storageKey, String(size)); } catch { /* storage unavailable */ }
  }, [filterKey, storageKey]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    /** Query-string fragment, e.g. "page=2&limit=25". */
    query: `page=${page}&limit=${pageSize}`,
    props: { page, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize },
  };
}

// Server-side helpers for paginated list endpoints.
//
// Pagination is opt-in: a list route only pages its results when the request
// carries ?page=. Callers that need the full list (pickers, selects) keep
// working without changes.

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

/** Returns null when the request didn't ask for a page. */
export function parsePagination(searchParams: URLSearchParams): PageParams | null {
  if (!searchParams.has('page')) return null;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const rawLimit = parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** Pagination metadata merged into the JSON response. */
export function pageMeta(total: number, p: PageParams) {
  return {
    total,
    page: p.page,
    limit: p.limit,
    totalPages: Math.max(1, Math.ceil(total / p.limit)),
  };
}

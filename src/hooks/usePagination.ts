// ============================================================================
// BusinessHub Enterprise - usePagination Hook
// Deterministic page, limit, and offset calculation for data tables
// ============================================================================

import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination(options: PaginationOptions = {}) {
  const [page, setPage] = useState<number>(options.initialPage || 1);
  const [limit, setLimit] = useState<number>(options.initialLimit || 25);
  const [total, setTotal] = useState<number>(0);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);
  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  const nextPage = useCallback(() => {
    setPage((p: number) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p: number) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    setTotal,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
  };
}

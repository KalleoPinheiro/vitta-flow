"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./client";

export interface PagedQueryResult<T> {
  items: T[] | null;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
}

/**
 * Lista paginada por limit/offset: primeira página via effect (recarrega quando
 * a URL base muda), páginas seguintes anexadas via loadMore().
 */
export function usePagedQuery<T>(baseUrl: string, pageSize: number): PagedQueryResult<T> {
  const [items, setItems] = useState<T[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pageUrl = useCallback(
    (offset: number) => {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}limit=${pageSize}&offset=${offset}`;
    },
    [baseUrl, pageSize],
  );

  useEffect(() => {
    let cancelled = false;
    apiFetch<T[]>(pageUrl(0))
      .then((page) => {
        if (!cancelled) {
          setItems(page);
          setHasMore(page.length === pageSize);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar dados");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageUrl, pageSize, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  const loadMore = useCallback(() => {
    const offset = items?.length ?? 0;
    apiFetch<T[]>(pageUrl(offset))
      .then((page) => {
        setItems((latest) => [...(latest ?? []), ...page]);
        setHasMore(page.length === pageSize);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      });
  }, [items, pageUrl, pageSize]);

  return { items, hasMore, error, refresh, loadMore };
}

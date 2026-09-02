"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetchPage } from "./client";

export interface CursorPagedQueryResult<T> {
  items: T[] | null;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
}

/**
 * Lista paginada por cursor (issue #75): primeira página via effect (recarrega
 * quando a URL base muda), páginas seguintes anexadas via loadMore(). Mesma
 * interface pública de `usePagedQuery` (offset) — troca é só o import na página.
 */
export function useCursorPagedQuery<T>(baseUrl: string, pageSize: number): CursorPagedQueryResult<T> {
  const [items, setItems] = useState<T[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pageUrl = useCallback(
    (cursor: string | null) => {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      return `${baseUrl}${separator}limit=${pageSize}${cursorParam}`;
    },
    [baseUrl, pageSize],
  );

  useEffect(() => {
    let cancelled = false;
    apiFetchPage<T>(pageUrl(null))
      .then((page) => {
        if (!cancelled) {
          setItems(page.items);
          setNextCursor(page.nextCursor);
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
  }, [pageUrl, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    apiFetchPage<T>(pageUrl(nextCursor))
      .then((page) => {
        setItems((latest) => [...(latest ?? []), ...page.items]);
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      });
  }, [nextCursor, pageUrl]);

  return { items, hasMore: nextCursor !== null, error, refresh, loadMore };
}

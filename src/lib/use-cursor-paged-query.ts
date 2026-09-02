"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  // Geração da requisição em curso: toda resposta (1ª página ou loadMore) só é
  // aplicada se ainda for a mais recente — evita que um loadMore atrasado (ou
  // disparado 2x antes do 1º resolver) sobrescreva um refresh()/troca de url
  // mais novo, ou duplique a página anexada.
  const requestIdRef = useRef(0);

  const pageUrl = useCallback(
    (cursor: string | null) => {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      return `${baseUrl}${separator}limit=${pageSize}${cursorParam}`;
    },
    [baseUrl, pageSize],
  );

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    apiFetchPage<T>(pageUrl(null))
      .then((page) => {
        if (requestIdRef.current === requestId) {
          setItems(page.items);
          setNextCursor(page.nextCursor);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (requestIdRef.current === requestId) {
          setError(err instanceof Error ? err.message : "Erro ao carregar dados");
        }
      });
  }, [pageUrl, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    const requestId = ++requestIdRef.current;
    apiFetchPage<T>(pageUrl(nextCursor))
      .then((page) => {
        if (requestIdRef.current !== requestId) return;
        setItems((latest) => [...(latest ?? []), ...page.items]);
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      });
  }, [nextCursor, pageUrl]);

  return { items, hasMore: nextCursor !== null, error, refresh, loadMore };
}

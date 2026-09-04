'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './client';

export interface ApiQueryResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useApiQuery<T>(url: string | null): ApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Chave da última requisição já resolvida (sucesso ou erro). Enquanto a
  // chave atual (`url:version`) não coincidir, a requisição está pendente —
  // deriva `isLoading` sem precisar de um `setState` síncrono no corpo do
  // efeito (proibido por `react-hooks/set-state-in-effect`).
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const requestKey = `${url ?? ''}:${version}`;
  const isLoading = url != null && settledKey !== requestKey;

  useEffect(() => {
    if (url == null) {
      return;
    }
    let cancelled = false;
    apiFetch<T>(url)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
          setSettledKey(requestKey);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro ao carregar dados',
          );
          setSettledKey(requestKey);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, requestKey]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  return url == null
    ? { data: null, error: null, isLoading: false, refresh }
    : { data, error, isLoading, refresh };
}

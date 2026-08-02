"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./client";

export interface ApiQueryResult<T> {
  data: T | null;
  error: string | null;
  refresh: () => void;
}

export function useApiQuery<T>(url: string | null): ApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

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
  }, [url, version]);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  return url == null ? { data: null, error: null, refresh } : { data, error, refresh };
}

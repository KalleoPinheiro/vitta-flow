"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./client";

export interface ApiQueryResult<T> {
  data: T | null;
  error: string | null;
  refresh: () => void;
}

export function useApiQuery<T>(url: string): ApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
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

  return { data, error, refresh };
}

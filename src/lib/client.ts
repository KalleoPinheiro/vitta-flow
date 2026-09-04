import type { ApiEnvelope } from './api-response';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  // SPEC_DEVIATION: dropped `envelope.data === null` from the throw condition.
  // Reason (issue #65): `data: null` is a valid SUCCESS payload for endpoints
  // whose resource is legitimately optional (ex.: anamnese ainda não
  // registrada) — `success`/`error` já carregam o sinal real de falha. Antes,
  // toda primeira leitura de um recurso ainda-inexistente lançava
  // "Erro desconhecido" e o catch do `useApiQuery` escondia isso atrás de
  // `data` permanecer `null` — exatamente o padrão "erro confundido com sem
  // dado" que a #65 pede pra corrigir.
  if (!response.ok || !envelope.success) {
    throw new ApiError(envelope.error ?? 'Erro desconhecido', response.status);
  }
  return envelope.data as T;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** Como `apiFetch`, mas para listagens paginadas por cursor (issue #75). */
export async function apiFetchPage<T>(
  path: string,
  init?: RequestInit,
): Promise<CursorPage<T>> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const envelope = (await response.json()) as ApiEnvelope<T[]>;
  if (!response.ok || !envelope.success) {
    throw new ApiError(envelope.error ?? 'Erro desconhecido', response.status);
  }
  return {
    items: envelope.data ?? [],
    nextCursor: envelope.meta?.nextCursor ?? null,
  };
}

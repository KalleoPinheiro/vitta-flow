'use client';

import type { ReactNode } from 'react';
import { EmptyState, LoadingIndicator } from './feedback';

interface PagedListProps<T> {
  items: T[] | null;
  emptyMessage: string;
  render: (items: T[]) => ReactNode;
}

/** Estados padrão de listagem paginada: carregando → vazio → conteúdo. */
export function PagedList<T>({
  items,
  emptyMessage,
  render,
}: PagedListProps<T>) {
  if (!items) {
    return <LoadingIndicator />;
  }
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return <>{render(items)}</>;
}

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Sem `test.globals: true`, o auto-cleanup do @testing-library/react entre
 * testes não se registra sozinho — DOM de um `it` vaza pro próximo no mesmo
 * arquivo (ambiguidade em getByText etc). Guardado por `document` para não
 * quebrar os arquivos com `environment: "node"` (maioria da suíte).
 */
afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});

/**
 * `after()` do Next.js exige um request scope real (AsyncLocalStorage) que não
 * existe ao chamar route handlers diretamente em teste — lança
 * "`after` was called outside a request scope". Substituímos por execução
 * imediata (fire-and-forget), preservando todo o resto do módulo real.
 */
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => {
      void task();
    },
  };
});

/**
 * Cursor opaco (base64url de um JSON com as colunas de ordenação da página) —
 * issue #75. Evita `offset`, que degrada com o volume (Postgres teria que
 * varrer e descartar N linhas a cada página).
 */
export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor<T>(cursor: string | null | undefined): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

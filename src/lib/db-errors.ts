function hasUniqueViolationCode(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    (value as { code: unknown }).code === '23505'
  );
}

/**
 * `true` para violação de unicidade do Postgres (SQLSTATE 23505). O Drizzle
 * envolve o erro original do driver em `DrizzleQueryError`, que guarda o
 * `code` em `.cause`, não na própria instância — checa os dois níveis.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (hasUniqueViolationCode(error)) {
    return true;
  }
  const cause = error instanceof Error ? error.cause : undefined;
  return hasUniqueViolationCode(cause);
}

import { and, eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Escopo por tenant centralizado (AD-017): `clinicId: null` é o papel de sistema
 * e retorna `extra` sozinho, sem filtro de clínica.
 */
export const withTenant = (
  table: { clinicId: PgColumn },
  clinicId: string | null,
  extra?: SQL,
): SQL | undefined => {
  if (clinicId === null) {
    return extra;
  }
  return and(eq(table.clinicId, clinicId), extra);
};

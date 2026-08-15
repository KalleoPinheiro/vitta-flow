import type { MonthlyReport } from "@/application/reports/get-monthly-report";

/**
 * Mês 100% no passado é imutável — recalcular o agregado inteiro a cada acesso
 * é desperdício (CONS2-11). Cache em memória por processo, bounded pelo nº de
 * meses de história; mês corrente nunca entra (CONS2-12). Para múltiplas
 * réplicas (era SaaS), trocar por cache compartilhado — anotado na Fase 6.
 */
const closedMonthCache = new Map<string, MonthlyReport>();

export function getCachedReport(monthKey: string): MonthlyReport | undefined {
  return closedMonthCache.get(monthKey);
}

export function cacheReport(monthKey: string, report: MonthlyReport): void {
  closedMonthCache.set(monthKey, report);
}

/** Uso em testes. */
export function clearReportCache(): void {
  closedMonthCache.clear();
}

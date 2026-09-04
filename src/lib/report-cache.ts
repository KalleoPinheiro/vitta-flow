import type { MonthlyReport } from '@/application/reports/get-monthly-report';

/**
 * Mês 100% no passado é imutável — recalcular o agregado inteiro a cada acesso
 * é desperdício (CONS2-11). Cache em memória por processo, bounded pelo nº de
 * meses de história; mês corrente nunca entra (CONS2-12). Para múltiplas
 * réplicas (era SaaS), trocar por cache compartilhado — anotado na Fase 6.
 */
/**
 * Limite real: o parâmetro `month` é livre (`0001-01`…`9999-12`), então sem teto
 * o cache cresceria com requisições arbitrárias. 240 meses = 20 anos de
 * histórico, muito além do uso real da clínica. Descarta o mais antigo (FIFO).
 */
const MAX_CACHED_MONTHS = 240;

const closedMonthCache = new Map<string, MonthlyReport>();

export function getCachedReport(monthKey: string): MonthlyReport | undefined {
  return closedMonthCache.get(monthKey);
}

export function cacheReport(monthKey: string, report: MonthlyReport): void {
  if (closedMonthCache.size >= MAX_CACHED_MONTHS) {
    const oldest = closedMonthCache.keys().next();
    if (!oldest.done) {
      closedMonthCache.delete(oldest.value);
    }
  }
  closedMonthCache.set(monthKey, report);
}

/** Uso em testes. */
export function clearReportCache(): void {
  closedMonthCache.clear();
}

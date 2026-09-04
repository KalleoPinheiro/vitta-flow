import { beforeEach, describe, expect, it } from 'vitest';
import type { MonthlyReport } from '@/application/reports/get-monthly-report';
import {
  cacheReport,
  clearReportCache,
  getCachedReport,
} from '@/lib/report-cache';

const report = (total: number): MonthlyReport =>
  ({ totalAppointments: total }) as unknown as MonthlyReport;

describe('Feature: Cache de relatórios de meses encerrados', () => {
  beforeEach(() => {
    clearReportCache();
  });

  it('Dado relatório cacheado, Quando buscar pela mesma chave, Então retorna o mesmo objeto', () => {
    const stored = report(7);
    cacheReport('2020-01', stored);

    expect(getCachedReport('2020-01')).toBe(stored);
    expect(getCachedReport('2020-02')).toBeUndefined();
  });

  it('Dado o teto de meses excedido, Quando cachear, Então descarta o mais antigo e mantém o novo', () => {
    // `month` é parâmetro livre — sem teto, requisições arbitrárias fariam o
    // cache crescer sem limite.
    for (let i = 0; i < 241; i += 1) {
      cacheReport(`ano-${i}`, report(i));
    }

    expect(getCachedReport('ano-0')).toBeUndefined();
    expect(getCachedReport('ano-240')).toBeDefined();
  });
});

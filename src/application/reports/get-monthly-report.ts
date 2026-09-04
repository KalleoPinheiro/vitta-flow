import {
  type BillingSummary,
  GetBillingSummary,
} from '@/application/billing/get-billing-summary';
import type { InvoiceRepository } from '@/domain/billing/invoice-repository';
import type { StockMovementRepository } from '@/domain/inventory/inventory-repositories';
import type { ProfessionalRepository } from '@/domain/professional/professional-repository';
import type { AppointmentStatus } from '@/domain/scheduling/appointment';
import type {
  AppointmentRepository,
  ProcedureRevenue,
} from '@/domain/scheduling/appointment-repository';

export type { ProcedureRevenue };

export interface ProcedureMargin extends ProcedureRevenue {
  supplyCostCents: number;
  marginCents: number;
}

export interface ProfessionalProduction {
  professionalId: string | null;
  professionalName: string;
  count: number;
  totalCents: number;
  /** Repasse = receita × commissionPct; null quando o profissional não tem %. */
  commissionCents: number | null;
}

export interface MonthlyReport {
  totalAppointments: number;
  byStatus: Record<AppointmentStatus, number>;
  noShowRate: number;
  revenueByProcedure: ProcedureMargin[];
  /** Saídas de material do período sem vínculo com consulta. */
  unattributedSupplyCostCents: number;
  totalSupplyCostCents: number;
  productionByProfessional: ProfessionalProduction[];
  billing: BillingSummary;
}

export interface MonthlyReportInput {
  from: Date;
  to: Date;
}

export class GetMonthlyReport {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly invoices: InvoiceRepository,
    private readonly stockMovements?: StockMovementRepository,
    private readonly professionals?: ProfessionalRepository,
  ) {}

  async execute(input: MonthlyReportInput): Promise<MonthlyReport> {
    const [stats, billing, outflowCosts, production] = await Promise.all([
      this.appointments.getStatsInRange(input.from, input.to),
      new GetBillingSummary(this.invoices).execute(input),
      this.stockMovements?.getOutflowCostInRange(input.from, input.to) ??
        Promise.resolve([]),
      this.appointments.getProductionInRange(input.from, input.to),
    ]);

    const { byStatus, revenueByProcedure } = stats;
    const totalAppointments = Object.values(byStatus).reduce(
      (sum, count) => sum + count,
      0,
    );
    const nonCancelled = totalAppointments - byStatus.cancelled;
    const noShowRate = nonCancelled > 0 ? byStatus.no_show / nonCancelled : 0;

    // Custo por procedimento: saídas vinculadas → consulta → procedimento.
    const attributed = outflowCosts.filter(
      (c): c is { appointmentId: string; totalCents: number } =>
        c.appointmentId != null,
    );
    const linkedAppointments = await this.appointments.findByIds(
      attributed.map((c) => c.appointmentId),
    );
    const procedureById = new Map(
      linkedAppointments.map((a) => [a.id, a.procedure]),
    );
    const costByProcedure = new Map<string, number>();
    let orphanCostCents = 0;
    for (const cost of attributed) {
      const procedure = procedureById.get(cost.appointmentId);
      if (procedure) {
        costByProcedure.set(
          procedure,
          (costByProcedure.get(procedure) ?? 0) + cost.totalCents,
        );
      } else {
        orphanCostCents += cost.totalCents;
      }
    }
    const unattributedSupplyCostCents =
      outflowCosts
        .filter((c) => c.appointmentId == null)
        .reduce((sum, c) => sum + c.totalCents, 0) + orphanCostCents;
    const totalSupplyCostCents = outflowCosts.reduce(
      (sum, c) => sum + c.totalCents,
      0,
    );

    return {
      totalAppointments,
      byStatus,
      noShowRate,
      revenueByProcedure: revenueByProcedure.map((entry) => {
        const supplyCostCents = costByProcedure.get(entry.procedure) ?? 0;
        return {
          ...entry,
          supplyCostCents,
          marginCents: entry.totalCents - supplyCostCents,
        };
      }),
      unattributedSupplyCostCents,
      totalSupplyCostCents,
      productionByProfessional: await this.buildProduction(production),
      billing,
    };
  }

  private async buildProduction(
    production: Array<{
      professionalId: string | null;
      count: number;
      totalCents: number;
    }>,
  ): Promise<ProfessionalProduction[]> {
    const ids = production
      .map((p) => p.professionalId)
      .filter((id): id is string => id != null);
    const professionals = (await this.professionals?.findByIds(ids)) ?? [];
    const byId = new Map(professionals.map((p) => [p.id, p]));

    return production
      .map((entry) => {
        const professional = entry.professionalId
          ? byId.get(entry.professionalId)
          : undefined;
        const pct = professional?.commissionPct ?? null;
        return {
          professionalId: entry.professionalId,
          professionalName: professional?.fullName ?? 'Sem atribuição',
          count: entry.count,
          totalCents: entry.totalCents,
          commissionCents:
            pct != null ? Math.round((entry.totalCents * pct) / 100) : null,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents);
  }
}

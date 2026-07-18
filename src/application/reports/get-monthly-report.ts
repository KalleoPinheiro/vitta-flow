import type {
  AppointmentRepository,
  ProcedureRevenue,
} from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import type { StockMovementRepository } from "@/domain/inventory/inventory-repositories";
import type { AppointmentStatus } from "@/domain/scheduling/appointment";
import {
  GetBillingSummary,
  type BillingSummary,
} from "@/application/billing/get-billing-summary";

export type { ProcedureRevenue };

export interface ProcedureMargin extends ProcedureRevenue {
  supplyCostCents: number;
  marginCents: number;
}

export interface MonthlyReport {
  totalAppointments: number;
  byStatus: Record<AppointmentStatus, number>;
  noShowRate: number;
  revenueByProcedure: ProcedureMargin[];
  /** Saídas de material do período sem vínculo com consulta. */
  unattributedSupplyCostCents: number;
  totalSupplyCostCents: number;
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
  ) {}

  async execute(input: MonthlyReportInput): Promise<MonthlyReport> {
    const [stats, billing, outflowCosts] = await Promise.all([
      this.appointments.getStatsInRange(input.from, input.to),
      new GetBillingSummary(this.invoices).execute(input),
      this.stockMovements?.getOutflowCostInRange(input.from, input.to) ?? Promise.resolve([]),
    ]);

    const { byStatus, revenueByProcedure } = stats;
    const totalAppointments = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const nonCancelled = totalAppointments - byStatus.cancelled;
    const noShowRate = nonCancelled > 0 ? byStatus.no_show / nonCancelled : 0;

    // Custo por procedimento: saídas vinculadas → consulta → procedimento.
    const attributed = outflowCosts.filter(
      (c): c is { appointmentId: string; totalCents: number } => c.appointmentId != null,
    );
    const linkedAppointments = await this.appointments.findByIds(
      attributed.map((c) => c.appointmentId),
    );
    const procedureById = new Map(linkedAppointments.map((a) => [a.id, a.procedure]));
    const costByProcedure = new Map<string, number>();
    let orphanCostCents = 0;
    for (const cost of attributed) {
      const procedure = procedureById.get(cost.appointmentId);
      if (procedure) {
        costByProcedure.set(procedure, (costByProcedure.get(procedure) ?? 0) + cost.totalCents);
      } else {
        orphanCostCents += cost.totalCents;
      }
    }
    const unattributedSupplyCostCents =
      outflowCosts
        .filter((c) => c.appointmentId == null)
        .reduce((sum, c) => sum + c.totalCents, 0) + orphanCostCents;
    const totalSupplyCostCents = outflowCosts.reduce((sum, c) => sum + c.totalCents, 0);

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
      billing,
    };
  }
}

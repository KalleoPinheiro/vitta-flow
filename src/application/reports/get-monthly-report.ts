import type {
  AppointmentRepository,
  ProcedureRevenue,
} from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import type { AppointmentStatus } from "@/domain/scheduling/appointment";
import {
  GetBillingSummary,
  type BillingSummary,
} from "@/application/billing/get-billing-summary";

export type { ProcedureRevenue };

export interface MonthlyReport {
  totalAppointments: number;
  byStatus: Record<AppointmentStatus, number>;
  noShowRate: number;
  revenueByProcedure: ProcedureRevenue[];
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
  ) {}

  async execute(input: MonthlyReportInput): Promise<MonthlyReport> {
    const [stats, billing] = await Promise.all([
      this.appointments.getStatsInRange(input.from, input.to),
      new GetBillingSummary(this.invoices).execute(input),
    ]);

    const { byStatus, revenueByProcedure } = stats;
    const totalAppointments = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    const nonCancelled = totalAppointments - byStatus.cancelled;
    const noShowRate = nonCancelled > 0 ? byStatus.no_show / nonCancelled : 0;

    return {
      totalAppointments,
      byStatus,
      noShowRate,
      revenueByProcedure,
      billing,
    };
  }
}

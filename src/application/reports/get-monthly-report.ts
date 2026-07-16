import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/domain/scheduling/appointment";
import {
  GetBillingSummary,
  type BillingSummary,
} from "@/application/billing/get-billing-summary";

export interface ProcedureRevenue {
  procedure: string;
  count: number;
  totalCents: number;
}

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
    const appointments = await this.appointments.findInRange(input.from, input.to);

    const byStatus = Object.fromEntries(
      APPOINTMENT_STATUSES.map((status) => [status, 0]),
    ) as Record<AppointmentStatus, number>;
    for (const appointment of appointments) {
      byStatus[appointment.status] += 1;
    }

    const nonCancelled = appointments.length - byStatus.cancelled;
    const noShowRate = nonCancelled > 0 ? byStatus.no_show / nonCancelled : 0;

    const revenueMap = new Map<string, ProcedureRevenue>();
    for (const appointment of appointments) {
      if (appointment.status !== "completed") continue;
      const current = revenueMap.get(appointment.procedure) ?? {
        procedure: appointment.procedure,
        count: 0,
        totalCents: 0,
      };
      revenueMap.set(appointment.procedure, {
        procedure: appointment.procedure,
        count: current.count + 1,
        totalCents: current.totalCents + appointment.price.cents,
      });
    }
    const revenueByProcedure = [...revenueMap.values()].sort(
      (a, b) => b.totalCents - a.totalCents,
    );

    const billing = await new GetBillingSummary(this.invoices).execute(input);

    return {
      totalAppointments: appointments.length,
      byStatus,
      noShowRate,
      revenueByProcedure,
      billing,
    };
  }
}

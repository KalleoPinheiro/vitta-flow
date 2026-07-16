import type { InvoiceRepository } from "@/domain/billing/invoice-repository";

export interface BillingSummaryInput {
  from: Date;
  to: Date;
}

export interface BillingSummary {
  paidCents: number;
  pendingCents: number;
  totalInvoices: number;
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
}

export class GetBillingSummary {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(input: BillingSummaryInput): Promise<BillingSummary> {
    const invoices = await this.invoices.findAll({ from: input.from, to: input.to });

    return invoices.reduce<BillingSummary>(
      (summary, invoice) => ({
        paidCents: summary.paidCents + (invoice.status === "paid" ? invoice.amount.cents : 0),
        pendingCents:
          summary.pendingCents + (invoice.status === "pending" ? invoice.amount.cents : 0),
        totalInvoices: summary.totalInvoices + 1,
        paidCount: summary.paidCount + (invoice.status === "paid" ? 1 : 0),
        pendingCount: summary.pendingCount + (invoice.status === "pending" ? 1 : 0),
        cancelledCount: summary.cancelledCount + (invoice.status === "cancelled" ? 1 : 0),
      }),
      {
        paidCents: 0,
        pendingCents: 0,
        totalInvoices: 0,
        paidCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
      },
    );
  }
}

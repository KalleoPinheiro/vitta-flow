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
    return this.invoices.summarize({ from: input.from, to: input.to });
  }
}

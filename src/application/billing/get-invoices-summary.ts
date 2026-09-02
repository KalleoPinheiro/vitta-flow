import type { InvoiceFilter, InvoiceRepository, InvoiceSummary } from "@/domain/billing/invoice-repository";

export class GetInvoicesSummary {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(filter: InvoiceFilter = {}): Promise<InvoiceSummary> {
    return this.invoices.summarize(filter);
  }
}

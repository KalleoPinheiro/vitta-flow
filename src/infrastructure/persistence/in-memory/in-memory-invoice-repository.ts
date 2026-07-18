import type { Invoice } from "@/domain/billing/invoice";
import type {
  InvoiceFilter,
  InvoicePage,
  InvoiceRepository,
  InvoiceSummary,
} from "@/domain/billing/invoice-repository";

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly invoices = new Map<string, Invoice>();

  async save(invoice: Invoice): Promise<void> {
    this.invoices.set(invoice.id, invoice);
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) ?? null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Invoice | null> {
    return (
      [...this.invoices.values()].find((i) => i.appointmentId === appointmentId) ?? null
    );
  }

  private matchesFilter(invoice: Invoice, filter?: InvoiceFilter): boolean {
    if (!filter) {
      return true;
    }
    if (filter.status && invoice.status !== filter.status) return false;
    if (filter.patientId && invoice.patientId !== filter.patientId) return false;
    if (filter.from && invoice.issuedAt.getTime() < filter.from.getTime()) return false;
    if (filter.to && invoice.issuedAt.getTime() >= filter.to.getTime()) return false;
    return true;
  }

  async findAll(filter?: InvoiceFilter, page: InvoicePage = {}): Promise<Invoice[]> {
    const all = [...this.invoices.values()]
      .filter((invoice) => this.matchesFilter(invoice, filter))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
    const offset = page.offset ?? 0;
    return page.limit != null ? all.slice(offset, offset + page.limit) : all.slice(offset);
  }

  async summarize(filter?: InvoiceFilter): Promise<InvoiceSummary> {
    const matching = [...this.invoices.values()].filter((invoice) =>
      this.matchesFilter(invoice, filter),
    );
    return matching.reduce<InvoiceSummary>(
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

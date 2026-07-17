import type { Invoice } from "@/domain/billing/invoice";
import type { InvoiceFilter, InvoiceRepository } from "@/domain/billing/invoice-repository";

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

  async findAll(filter?: InvoiceFilter): Promise<Invoice[]> {
    return [...this.invoices.values()]
      .filter((invoice) => this.matchesFilter(invoice, filter))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }
}

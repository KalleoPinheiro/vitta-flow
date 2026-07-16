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

  async findAll(filter?: InvoiceFilter): Promise<Invoice[]> {
    return [...this.invoices.values()]
      .filter((i) => {
        if (filter?.status && i.status !== filter.status) return false;
        if (filter?.patientId && i.patientId !== filter.patientId) return false;
        if (filter?.from && i.issuedAt.getTime() < filter.from.getTime()) return false;
        if (filter?.to && i.issuedAt.getTime() >= filter.to.getTime()) return false;
        return true;
      })
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }
}

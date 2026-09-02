import type { Invoice } from "@/domain/billing/invoice";
import type { InvoiceFilter, InvoiceRepository } from "@/domain/billing/invoice-repository";
import type { PatientRepository } from "@/domain/patient/patient-repository";

export interface InvoiceWithPatient {
  invoice: Invoice;
  patientName: string;
}

export class ListInvoices {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(
    filter: InvoiceFilter = {},
    page: { limit?: number; cursor?: string } = {},
  ): Promise<InvoiceWithPatient[]> {
    const invoices = await this.invoices.findAll(filter, page);
    const patients = await this.patients.findByIds(invoices.map((i) => i.patientId));
    const namesById = new Map(patients.map((p) => [p.id, p.fullName]));

    return invoices.map((invoice) => ({
      invoice,
      patientName: namesById.get(invoice.patientId) ?? "Paciente desconhecido",
    }));
  }
}

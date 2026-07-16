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

  async execute(filter: InvoiceFilter = {}): Promise<InvoiceWithPatient[]> {
    const invoices = await this.invoices.findAll(filter);
    const patients = await this.patients.findAll();
    const namesById = new Map(patients.map((p) => [p.id, p.fullName]));

    return invoices.map((invoice) => ({
      invoice,
      patientName: namesById.get(invoice.patientId) ?? "Paciente desconhecido",
    }));
  }
}

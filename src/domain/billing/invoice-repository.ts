import type { Invoice, InvoiceStatus } from "./invoice";

export interface InvoiceFilter {
  status?: InvoiceStatus;
  patientId?: string;
  from?: Date;
  to?: Date;
}

export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  findByAppointmentId(appointmentId: string): Promise<Invoice | null>;
  findAll(filter?: InvoiceFilter): Promise<Invoice[]>;
}

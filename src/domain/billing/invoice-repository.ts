import type { Invoice, InvoiceStatus } from './invoice';

export interface InvoiceFilter {
  status?: InvoiceStatus;
  patientId?: string;
  from?: Date;
  to?: Date;
}

export interface InvoicePage {
  limit?: number;
  /** Cursor opaco (issue #75) — retoma após o último item da página anterior. */
  cursor?: string;
}

export interface InvoiceSummary {
  paidCents: number;
  pendingCents: number;
  totalInvoices: number;
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
}

export interface InvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  findByAppointmentId(appointmentId: string): Promise<Invoice | null>;
  findAll(filter?: InvoiceFilter, page?: InvoicePage): Promise<Invoice[]>;
  /** Agregação no banco — totais corretos independentemente do volume de faturas. */
  summarize(filter?: InvoiceFilter): Promise<InvoiceSummary>;
}

import type { Database } from "better-sqlite3";
import { Invoice, type InvoiceStatus, type PaymentMethod } from "@/domain/billing/invoice";
import type { InvoiceFilter, InvoiceRepository } from "@/domain/billing/invoice-repository";
import { Money } from "@/domain/shared/money";

interface InvoiceRow {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  description: string;
  amount_cents: number;
  status: string;
  issued_at: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
}

const toInvoice = (row: InvoiceRow): Invoice =>
  Invoice.restore({
    id: row.id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    description: row.description,
    amount: Money.fromCents(row.amount_cents),
    status: row.status as InvoiceStatus,
    issuedAt: new Date(row.issued_at),
    dueDate: row.due_date ? new Date(row.due_date) : null,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? null,
  });

export class SqliteInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: Database) {}

  async save(invoice: Invoice): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO invoices (id, patient_id, appointment_id, description, amount_cents, status, issued_at, due_date, paid_at, payment_method)
         VALUES (@id, @patientId, @appointmentId, @description, @amountCents, @status, @issuedAt, @dueDate, @paidAt, @paymentMethod)
         ON CONFLICT(id) DO UPDATE SET
           patient_id = @patientId, appointment_id = @appointmentId, description = @description,
           amount_cents = @amountCents, status = @status, due_date = @dueDate,
           paid_at = @paidAt, payment_method = @paymentMethod`,
      )
      .run({
        id: invoice.id,
        patientId: invoice.patientId,
        appointmentId: invoice.appointmentId,
        description: invoice.description,
        amountCents: invoice.amount.cents,
        status: invoice.status,
        issuedAt: invoice.issuedAt.toISOString(),
        dueDate: invoice.dueDate?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        paymentMethod: invoice.paymentMethod,
      });
  }

  async findById(id: string): Promise<Invoice | null> {
    const row = this.db.prepare<[string], InvoiceRow>("SELECT * FROM invoices WHERE id = ?").get(id);
    return row ? toInvoice(row) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Invoice | null> {
    const row = this.db
      .prepare<[string], InvoiceRow>("SELECT * FROM invoices WHERE appointment_id = ?")
      .get(appointmentId);
    return row ? toInvoice(row) : null;
  }

  async findAll(filter: InvoiceFilter = {}): Promise<Invoice[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.status) {
      conditions.push("status = ?");
      params.push(filter.status);
    }
    if (filter.patientId) {
      conditions.push("patient_id = ?");
      params.push(filter.patientId);
    }
    if (filter.from) {
      conditions.push("issued_at >= ?");
      params.push(filter.from.toISOString());
    }
    if (filter.to) {
      conditions.push("issued_at < ?");
      params.push(filter.to.toISOString());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.db
      .prepare<(string | number)[], InvoiceRow>(
        `SELECT * FROM invoices ${where} ORDER BY issued_at DESC`,
      )
      .all(...params)
      .map(toInvoice);
  }
}

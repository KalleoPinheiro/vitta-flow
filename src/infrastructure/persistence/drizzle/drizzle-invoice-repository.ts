import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { Invoice, type InvoiceStatus, type PaymentMethod } from "@/domain/billing/invoice";
import type { InvoiceFilter, InvoiceRepository } from "@/domain/billing/invoice-repository";
import { Money } from "@/domain/shared/money";
import type { AppDb } from "./db";
import { invoices } from "./schema";

type InvoiceRow = typeof invoices.$inferSelect;

const toInvoice = (row: InvoiceRow): Invoice =>
  Invoice.restore({
    id: row.id,
    patientId: row.patientId,
    appointmentId: row.appointmentId,
    description: row.description,
    amount: Money.fromCents(row.amountCents),
    status: row.status as InvoiceStatus,
    issuedAt: row.issuedAt,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    paymentMethod: row.paymentMethod as PaymentMethod | null,
  });

export class DrizzleInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: AppDb) {}

  async save(invoice: Invoice): Promise<void> {
    const values = {
      id: invoice.id,
      patientId: invoice.patientId,
      appointmentId: invoice.appointmentId,
      description: invoice.description,
      amountCents: invoice.amount.cents,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
    };
    await this.db
      .insert(invoices)
      .values(values)
      .onConflictDoUpdate({ target: invoices.id, set: values });
  }

  async findById(id: string): Promise<Invoice | null> {
    const rows = await this.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return rows[0] ? toInvoice(rows[0]) : null;
  }

  async findByAppointmentId(appointmentId: string): Promise<Invoice | null> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.appointmentId, appointmentId))
      .limit(1);
    return rows[0] ? toInvoice(rows[0]) : null;
  }

  async findAll(filter: InvoiceFilter = {}): Promise<Invoice[]> {
    const conditions: SQL[] = [];
    if (filter.status) conditions.push(eq(invoices.status, filter.status));
    if (filter.patientId) conditions.push(eq(invoices.patientId, filter.patientId));
    if (filter.from) conditions.push(gte(invoices.issuedAt, filter.from));
    if (filter.to) conditions.push(lt(invoices.issuedAt, filter.to));

    const rows = await this.db
      .select()
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(invoices.issuedAt));
    return rows.map(toInvoice);
  }
}

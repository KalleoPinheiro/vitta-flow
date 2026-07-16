import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const patients = pgTable("patients", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  birthDate: timestamp("birth_date", { withTimezone: true, mode: "date" }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    procedure: text("procedure").notNull(),
    priceCents: integer("price_cents").notNull(),
    notes: text("notes"),
    status: text("status").notNull(),
    googleEventId: text("google_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_appointments_starts_at").on(table.startsAt),
    index("idx_appointments_patient").on(table.patientId),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    appointmentId: text("appointment_id"),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
    paymentMethod: text("payment_method"),
  },
  (table) => [
    index("idx_invoices_status").on(table.status),
    index("idx_invoices_issued_at").on(table.issuedAt),
  ],
);

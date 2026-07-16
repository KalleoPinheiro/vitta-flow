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

export const anamneses = pgTable("anamneses", {
  patientId: text("patient_id")
    .primaryKey()
    .references(() => patients.id),
  comorbidities: text("comorbidities").notNull().default(""),
  allergies: text("allergies").notNull().default(""),
  medications: text("medications").notNull().default(""),
  surgicalHistory: text("surgical_history").notNull().default(""),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const evolutionNotes = pgTable(
  "evolution_notes",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    appointmentId: text("appointment_id"),
    subjective: text("subjective").notNull().default(""),
    objective: text("objective").notNull().default(""),
    assessment: text("assessment").notNull().default(""),
    plan: text("plan").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_evolution_notes_patient").on(table.patientId)],
);

export const clinicalConditions = pgTable(
  "clinical_conditions",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    stomaType: text("stoma_type"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    notes: text("notes"),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_clinical_conditions_patient").on(table.patientId)],
);

export const conditionAssessments = pgTable(
  "condition_assessments",
  {
    id: text("id").primaryKey(),
    conditionId: text("condition_id")
      .notNull()
      .references(() => clinicalConditions.id),
    lengthMm: integer("length_mm"),
    widthMm: integer("width_mm"),
    depthMm: integer("depth_mm"),
    tissueType: text("tissue_type"),
    exudate: text("exudate"),
    painScale: integer("pain_scale"),
    skinCondition: text("skin_condition"),
    complications: text("complications"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_condition_assessments_condition").on(table.conditionId)],
);

export const supplies = pgTable("supplies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  minQty: integer("min_qty").notNull(),
  priceCents: integer("price_cents").notNull(),
  stockQty: integer("stock_qty").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    supplyId: text("supply_id")
      .notNull()
      .references(() => supplies.id),
    type: text("type").notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_stock_movements_supply").on(table.supplyId)],
);

export const followUps = pgTable(
  "follow_ups",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    appointmentId: text("appointment_id"),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }).notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_follow_ups_status").on(table.status),
    index("idx_follow_ups_due_date").on(table.dueDate),
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

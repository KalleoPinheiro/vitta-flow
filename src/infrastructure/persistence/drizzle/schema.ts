import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const partners = pgTable("partners", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  crm: text("crm"),
  specialty: text("specialty"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const patients = pgTable(
  "patients",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    birthDate: timestamp("birth_date", { withTimezone: true, mode: "date" }),
    notes: text("notes"),
    referredByPartnerId: text("referred_by_partner_id").references(() => partners.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_patients_referrer").on(table.referredByPartnerId),
    // Ordenação padrão das listagens.
    index("idx_patients_full_name").on(table.fullName),
    // Busca com ILIKE '%termo%' — GIN + pg_trgm evita full scan.
    index("idx_patients_full_name_trgm").using("gin", table.fullName.op("gin_trgm_ops")),
    index("idx_patients_email_trgm").using("gin", table.email.op("gin_trgm_ops")),
    index("idx_patients_phone_trgm").using("gin", table.phone.op("gin_trgm_ops")),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }).notNull(),
    // Mantida por trigger (migração 0002) para a constraint de exclusão anti-double-booking.
    endsAtBuffered: timestamp("ends_at_buffered", { withTimezone: true, mode: "date" }),
    procedure: text("procedure").notNull(),
    priceCents: integer("price_cents").notNull(),
    notes: text("notes"),
    status: text("status").notNull(),
    googleEventId: text("google_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_appointments_starts_at").on(table.startsAt),
    // Composto cobre findByPatientId com ORDER BY starts_at.
    index("idx_appointments_patient").on(table.patientId, table.startsAt),
  ],
);

export const googleAccounts = pgTable("google_accounts", {
  email: text("email").primaryKey(),
  // Refresh token do OAuth cifrado com AES-256-GCM (chave derivada de AUTH_SECRET).
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true, mode: "date" }).notNull(),
});

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

export const conditionPhotos = pgTable(
  "condition_photos",
  {
    id: text("id").primaryKey(),
    conditionId: text("condition_id")
      .notNull()
      .references(() => clinicalConditions.id),
    assessmentId: text("assessment_id"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_condition_photos_condition").on(table.conditionId)],
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

export const supplyBatches = pgTable(
  "supply_batches",
  {
    id: text("id").primaryKey(),
    supplyId: text("supply_id")
      .notNull()
      .references(() => supplies.id),
    label: text("label"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    quantity: integer("quantity").notNull(),
    remaining: integer("remaining").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_supply_batches_supply").on(table.supplyId),
    index("idx_supply_batches_expires_at").on(table.expiresAt),
  ],
);

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
    // Consulta atendida com este material (custo por atendimento).
    appointmentId: text("appointment_id").references(() => appointments.id),
    // Preço unitário congelado na saída — histórico imune a reajustes.
    unitPriceCents: integer("unit_price_cents"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_stock_movements_supply").on(table.supplyId),
    index("idx_stock_movements_appointment").on(table.appointmentId),
    index("idx_stock_movements_created_at").on(table.createdAt),
  ],
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

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    actorRole: text("actor_role").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    patientId: text("patient_id"),
    detail: text("detail"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_audit_events_patient").on(table.patientId),
    index("idx_audit_events_occurred_at").on(table.occurredAt),
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
    // Portal do paciente e filtros por paciente.
    index("idx_invoices_patient").on(table.patientId),
  ],
);

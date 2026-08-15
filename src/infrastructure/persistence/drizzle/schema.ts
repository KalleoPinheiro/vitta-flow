import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const professionals = pgTable("professionals", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  registry: text("registry"),
  // Repasse (O3.4): % da receita das consultas concluídas do profissional.
  commissionPct: integer("commission_pct"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const procedures = pgTable(
  "procedures",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    // Unicidade case-insensitive do catálogo.
    uniqueIndex("uq_procedures_name").on(sql`lower(${table.name})`),
  ],
);

export const procedureSupplies = pgTable(
  "procedure_supplies",
  {
    procedureId: text("procedure_id")
      .notNull()
      .references(() => procedures.id),
    supplyId: text("supply_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    uniqueIndex("uq_procedure_supplies").on(table.procedureId, table.supplyId),
  ],
);

export const userAccounts = pgTable("user_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Formato scrypt$custo$salt$hash — nunca a senha em claro.
  passwordHash: text("password_hash").notNull(),
  professionalId: text("professional_id").references(() => professionals.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const scheduleSettings = pgTable("schedule_settings", {
  // Linha única ("default") — grade da clínica.
  id: text("id").primaryKey(),
  weekdays: text("weekdays").notNull(),
  startHour: integer("start_hour").notNull(),
  endHour: integer("end_hour").notNull(),
  minGapMinutes: integer("min_gap_minutes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
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
    // Profissional responsável (F9) — nullable, retrocompatível.
    professionalId: text("professional_id").references(() => professionals.id),
    // Procedimento do catálogo (O1.1) — nullable, histórico intacto.
    procedureId: text("procedure_id").references(() => procedures.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_appointments_starts_at").on(table.startsAt),
    index("idx_appointments_professional").on(table.professionalId),
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
    // Autor da evolução (F9) — nullable, retrocompatível.
    professionalId: text("professional_id").references(() => professionals.id),
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
    // Complicações canônicas (CSV de enum) — O2.2; texto livre legado preservado acima.
    complicationCodes: text("complication_codes"),
    // Escala DET (estomias): área 0–3 e severidade 0–2 por domínio — O2.2.
    detDiscolorationArea: integer("det_discoloration_area"),
    detDiscolorationSeverity: integer("det_discoloration_severity"),
    detErosionArea: integer("det_erosion_area"),
    detErosionSeverity: integer("det_erosion_severity"),
    detOvergrowthArea: integer("det_overgrowth_area"),
    detOvergrowthSeverity: integer("det_overgrowth_severity"),
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
    // Monitoramento remoto (O4.2): origem, observação do paciente e triagem.
    origin: text("origin").notNull().default("staff"),
    patientNote: text("patient_note"),
    triageStatus: text("triage_status"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_condition_photos_condition").on(table.conditionId),
    index("idx_condition_photos_triage").on(table.triageStatus),
  ],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    textHash: text("text_hash").notNull(),
    ipAddress: text("ip_address"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_consent_records_patient").on(table.patientId)],
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

export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    referenceId: text("reference_id").notNull(),
    sentOn: text("sent_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    // Idempotência diária: um lembrete por (tipo, referência, dia).
    uniqueIndex("uq_reminder_logs_daily").on(table.kind, table.referenceId, table.sentOn),
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

export const sessionPackages = pgTable(
  "session_packages",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    procedureId: text("procedure_id")
      .notNull()
      .references(() => procedures.id),
    totalSessions: integer("total_sessions").notNull(),
    usedSessions: integer("used_sessions").notNull().default(0),
    priceCents: integer("price_cents").notNull(),
    // Validade opcional (COMP3-07) — null = sem validade (histórico preservado).
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("idx_session_packages_patient").on(table.patientId)],
);

export const packageConsumptions = pgTable(
  "package_consumptions",
  {
    packageId: text("package_id")
      .notNull()
      .references(() => sessionPackages.id),
    appointmentId: text("appointment_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    // Uma consulta consome no máximo uma sessão (idempotência da conclusão reparadora).
    uniqueIndex("uq_package_consumption_appointment").on(table.appointmentId),
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

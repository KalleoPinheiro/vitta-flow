import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "@/infrastructure/persistence/drizzle/schema";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");
const TARGET_MIGRATION = "0019_clinic-foundation.sql";

/** Tabelas tocadas pela fundação de multi-tenancy (MT-02) — uma linha mínima cada, sem clinic_id. */
const FIXTURE_STATEMENTS: string[] = [
  `INSERT INTO "partners" (id, full_name, email, phone, active, created_at) VALUES ('p1','Parceiro','p1@x.com','111',true, now())`,
  `INSERT INTO "professionals" (id, full_name, active, created_at) VALUES ('pr1','Prof',true, now())`,
  `INSERT INTO "procedures" (id, name, price_cents, duration_minutes, active, created_at) VALUES ('proc1','Proc',100,30,true, now())`,
  `INSERT INTO "user_accounts" (id, email, password_hash, active, created_at) VALUES ('u1','u1@x.com','h',true, now())`,
  `INSERT INTO "patients" (id, full_name, email, phone, active, created_at) VALUES ('pat1','Paciente','pat1@x.com','222',true, now())`,
  `INSERT INTO "schedule_settings" (id, weekdays, start_hour, end_hour, min_gap_minutes, updated_at) VALUES ('s1','1,2,3,4,5',8,18,15, now())`,
  `INSERT INTO "appointments" (id, patient_id, starts_at, ends_at, procedure, price_cents, status, created_at) VALUES ('a1','pat1', now(), now() + interval '30 minutes', 'Proc', 100, 'scheduled', now())`,
  `INSERT INTO "anamneses" (patient_id, updated_at) VALUES ('pat1', now())`,
  `INSERT INTO "evolution_notes" (id, patient_id, appointment_id, created_at) VALUES ('en1','pat1','a1', now())`,
  `INSERT INTO "clinical_conditions" (id, patient_id, kind, title, status, created_at) VALUES ('cc1','pat1','pressure_injury','Lesão','active', now())`,
  `INSERT INTO "condition_assessments" (id, condition_id, created_at) VALUES ('ca1','cc1', now())`,
  `INSERT INTO "condition_photos" (id, condition_id, content_type, size_bytes, created_at) VALUES ('cp1','cc1','image/jpeg',100, now())`,
  `INSERT INTO "consent_records" (id, patient_id, text_hash, accepted_at) VALUES ('cr1','pat1','hash', now())`,
  `INSERT INTO "supplies" (id, name, unit, min_qty, price_cents, created_at) VALUES ('sup1','Gaze','un',5,100, now())`,
  `INSERT INTO "supply_batches" (id, supply_id, quantity, remaining, created_at) VALUES ('sb1','sup1',10,10, now())`,
  `INSERT INTO "stock_movements" (id, supply_id, type, quantity, reason, created_at) VALUES ('sm1','sup1','in',1,'compra', now())`,
  `INSERT INTO "follow_ups" (id, patient_id, due_date, reason, status, created_at) VALUES ('fu1','pat1', now(), 'retorno','pending', now())`,
  `INSERT INTO "reminder_logs" (id, kind, reference_id, sent_on, created_at) VALUES ('rl1','confirmation','a1', now()::date, now())`,
  `INSERT INTO "audit_events" (id, actor_role, actor_id, action, resource_type, resource_id, occurred_at) VALUES ('ae1','system','system','create','patient','pat1', now())`,
  `INSERT INTO "session_packages" (id, patient_id, procedure_id, total_sessions, used_sessions, price_cents, active, created_at) VALUES ('sp1','pat1','proc1',10,0,1000,true, now())`,
  `INSERT INTO "package_consumptions" (package_id, appointment_id, created_at) VALUES ('sp1','a1', now())`,
  `INSERT INTO "invoices" (id, patient_id, appointment_id, description, amount_cents, status, issued_at) VALUES ('inv1','pat1','a1','Consulta',1000,'pending', now())`,
  `INSERT INTO "care_plans" (id, patient_id, condition_id, status, created_at) VALUES ('cpl1','pat1','cc1','active', now())`,
  `INSERT INTO "care_plan_diagnoses" (id, care_plan_id, diagnosis_code, type, created_at) VALUES ('cpd1','cpl1', '00046', 'actual', now())`,
  `INSERT INTO "care_plan_outcomes" (id, care_plan_id, outcome_code, baseline_score, target_score, created_at) VALUES ('cpo1','cpl1', '1101', 2, 4, now())`,
  `INSERT INTO "care_plan_interventions" (id, care_plan_id, intervention_code, frequency, priority, created_at) VALUES ('cpi1','cpl1', '3660', 'daily','high', now())`,
  `INSERT INTO "outcome_evaluations" (id, outcome_id, score, evaluated_at) VALUES ('oe1','cpo1', 3, now())`,
  `INSERT INTO "intervention_records" (id, intervention_id, performed_at) VALUES ('ir1','cpi1', now())`,
];

const TENANT_TABLES = [
  "anamneses",
  "appointments",
  "audit_events",
  "care_plan_diagnoses",
  "care_plan_interventions",
  "care_plan_outcomes",
  "care_plans",
  "clinical_conditions",
  "condition_assessments",
  "condition_photos",
  "consent_records",
  "evolution_notes",
  "follow_ups",
  "intervention_records",
  "invoices",
  "outcome_evaluations",
  "package_consumptions",
  "partners",
  "patients",
  "procedures",
  "professionals",
  "reminder_logs",
  "schedule_settings",
  "session_packages",
  "stock_movements",
  "supplies",
  "supply_batches",
  "user_accounts",
];

describe("Feature: Migração de backfill de clinic_id", () => {
  let db: PgliteDatabase<typeof schema>;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
    db = drizzle(client, { schema });

    const priorMigrationsDir = fs.mkdtempSync(path.join(process.cwd(), ".tmp-migrate-"));
    const priorMeta = path.join(priorMigrationsDir, "meta");
    fs.mkdirSync(priorMeta);
    const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"));
    const targetIdx = journal.entries.find(
      (e: { tag: string }) => e.tag === "0019_clinic-foundation",
    ).idx;
    // Só as migrações estritamente anteriores a 0019 — migrações posteriores
    // (ex.: 0020, que depende das colunas criadas por 0019) não podem rodar
    // antes dela.
    journal.entries = journal.entries.filter((e: { idx: number }) => e.idx < targetIdx);
    fs.writeFileSync(path.join(priorMeta, "_journal.json"), JSON.stringify(journal));
    for (const entry of journal.entries) {
      fs.copyFileSync(
        path.join(MIGRATIONS_DIR, "meta", `${String(entry.idx).padStart(4, "0")}_snapshot.json`),
        path.join(priorMeta, `${String(entry.idx).padStart(4, "0")}_snapshot.json`),
      );
      fs.copyFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), path.join(priorMigrationsDir, `${entry.tag}.sql`));
    }

    await migrate(db, { migrationsFolder: priorMigrationsDir });
    fs.rmSync(priorMigrationsDir, { recursive: true, force: true });

    for (const statement of FIXTURE_STATEMENTS) {
      await db.execute(sql.raw(statement));
    }

    const migrationSql = fs.readFileSync(path.join(MIGRATIONS_DIR, TARGET_MIGRATION), "utf8");
    for (const statement of migrationSql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) {
        await db.execute(sql.raw(trimmed));
      }
    }
  });

  it("cria a clínica legada", async () => {
    const rows = await db.execute(sql.raw(`SELECT id, name FROM "clinics" WHERE id = 'legacy-clinic'`));
    expect(rows.rows).toHaveLength(1);
  });

  it.each(TENANT_TABLES)("100%% das linhas de %s recebem o clinic_id da clínica legada, zero linha órfã", async (table) => {
    const total = await db.execute(sql.raw(`SELECT count(*)::int AS c FROM "${table}"`));
    const orphans = await db.execute(
      sql.raw(`SELECT count(*)::int AS c FROM "${table}" WHERE clinic_id IS NULL OR clinic_id <> 'legacy-clinic'`),
    );
    expect(Number((total.rows[0] as { c: number }).c)).toBeGreaterThan(0);
    expect(Number((orphans.rows[0] as { c: number }).c)).toBe(0);
  });
});

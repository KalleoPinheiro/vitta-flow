CREATE TABLE "clinics" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
INSERT INTO "clinics" ("id", "name", "created_at", "created_by") VALUES ('legacy-clinic', 'Clínica legada', now(), 'system-migration');
--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_email_unique";--> statement-breakpoint
ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_email_unique";--> statement-breakpoint
DROP INDEX "uq_procedures_name";--> statement-breakpoint
ALTER TABLE "anamneses" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "care_plan_diagnoses" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "care_plan_interventions" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "care_plan_outcomes" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "care_plans" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "clinical_conditions" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "condition_photos" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "evolution_notes" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "package_consumptions" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "procedures" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "schedule_settings" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "session_packages" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "supply_batches" ADD COLUMN "clinic_id" text;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "clinic_id" text;--> statement-breakpoint
UPDATE "anamneses" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "appointments" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "audit_events" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "care_plan_diagnoses" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "care_plan_interventions" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "care_plan_outcomes" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "care_plans" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "clinical_conditions" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "condition_assessments" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "condition_photos" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "consent_records" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "evolution_notes" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "follow_ups" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "intervention_records" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "invoices" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "outcome_evaluations" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "package_consumptions" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "partners" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "patients" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "procedures" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "professionals" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "reminder_logs" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "schedule_settings" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "session_packages" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "stock_movements" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "supplies" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "supply_batches" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
UPDATE "user_accounts" SET "clinic_id" = 'legacy-clinic' WHERE "clinic_id" IS NULL;--> statement-breakpoint
ALTER TABLE "anamneses" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "care_plan_diagnoses" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "care_plan_interventions" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "care_plan_outcomes" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "care_plans" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clinical_conditions" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "condition_assessments" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "condition_photos" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "evolution_notes" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "intervention_records" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "package_consumptions" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "procedures" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_logs" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_settings" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "session_packages" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supply_batches" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accounts" ALTER COLUMN "clinic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_diagnoses" ADD CONSTRAINT "care_plan_diagnoses_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_interventions" ADD CONSTRAINT "care_plan_interventions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_outcomes" ADD CONSTRAINT "care_plan_outcomes_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_conditions" ADD CONSTRAINT "clinical_conditions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD CONSTRAINT "condition_assessments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_notes" ADD CONSTRAINT "evolution_notes_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ADD CONSTRAINT "outcome_evaluations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_settings" ADD CONSTRAINT "schedule_settings_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_packages" ADD CONSTRAINT "session_packages_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_batches" ADD CONSTRAINT "supply_batches_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_anamneses_clinic" ON "anamneses" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_clinic" ON "appointments" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_clinic" ON "audit_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_care_plan_diagnoses_clinic" ON "care_plan_diagnoses" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_care_plan_interventions_clinic" ON "care_plan_interventions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_care_plan_outcomes_clinic" ON "care_plan_outcomes" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_care_plans_clinic" ON "care_plans" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_clinical_conditions_clinic" ON "clinical_conditions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_condition_assessments_clinic" ON "condition_assessments" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_condition_photos_clinic" ON "condition_photos" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_consent_records_clinic" ON "consent_records" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_evolution_notes_clinic" ON "evolution_notes" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_clinic" ON "follow_ups" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_intervention_records_clinic" ON "intervention_records" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_clinic" ON "invoices" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_outcome_evaluations_clinic" ON "outcome_evaluations" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_package_consumptions_clinic" ON "package_consumptions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_partners_clinic" ON "partners" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_patients_clinic" ON "patients" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_patients_clinic_email" ON "patients" USING btree ("clinic_id","email");--> statement-breakpoint
CREATE INDEX "idx_procedures_clinic" ON "procedures" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_professionals_clinic" ON "professionals" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_reminder_logs_clinic" ON "reminder_logs" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_schedule_settings_clinic" ON "schedule_settings" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_session_packages_clinic" ON "session_packages" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_clinic" ON "stock_movements" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_supplies_clinic" ON "supplies" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_supply_batches_clinic" ON "supply_batches" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_accounts_clinic_email" ON "user_accounts" USING btree ("clinic_id","email");--> statement-breakpoint
CREATE INDEX "idx_user_accounts_clinic" ON "user_accounts" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_procedures_name" ON "procedures" USING btree ("clinic_id",lower("name"));

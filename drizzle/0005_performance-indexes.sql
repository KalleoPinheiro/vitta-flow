CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
DROP INDEX "idx_appointments_patient";--> statement-breakpoint
CREATE INDEX "idx_invoices_patient" ON "invoices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_patients_full_name" ON "patients" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_patients_full_name_trgm" ON "patients" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_patients_email_trgm" ON "patients" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_patients_phone_trgm" ON "patients" USING gin ("phone" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_appointments_patient" ON "appointments" USING btree ("patient_id","starts_at");
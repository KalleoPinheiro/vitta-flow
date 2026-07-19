CREATE TABLE "consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"text_hash" text NOT NULL,
	"ip_address" text,
	"accepted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "condition_photos" ADD COLUMN "origin" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "condition_photos" ADD COLUMN "patient_note" text;--> statement-breakpoint
ALTER TABLE "condition_photos" ADD COLUMN "triage_status" text;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_consent_records_patient" ON "consent_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_condition_photos_triage" ON "condition_photos" USING btree ("triage_status");
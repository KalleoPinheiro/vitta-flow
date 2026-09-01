CREATE TABLE "professional_patient_links" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"professional_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "professional_patient_links" ADD CONSTRAINT "professional_patient_links_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_patient_links" ADD CONSTRAINT "professional_patient_links_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_patient_links" ADD CONSTRAINT "professional_patient_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_professional_patient_links" ON "professional_patient_links" USING btree ("professional_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_professional_patient_links_professional" ON "professional_patient_links" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "idx_professional_patient_links_clinic" ON "professional_patient_links" USING btree ("clinic_id");
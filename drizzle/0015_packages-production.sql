CREATE TABLE "package_consumptions" (
	"package_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"procedure_id" text NOT NULL,
	"total_sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN "commission_pct" integer;--> statement-breakpoint
ALTER TABLE "package_consumptions" ADD CONSTRAINT "package_consumptions_package_id_session_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."session_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_packages" ADD CONSTRAINT "session_packages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_packages" ADD CONSTRAINT "session_packages_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_package_consumption_appointment" ON "package_consumptions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_session_packages_patient" ON "session_packages" USING btree ("patient_id");
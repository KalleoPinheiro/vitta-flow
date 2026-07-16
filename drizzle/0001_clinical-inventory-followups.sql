CREATE TABLE "anamneses" (
	"patient_id" text PRIMARY KEY NOT NULL,
	"comorbidities" text DEFAULT '' NOT NULL,
	"allergies" text DEFAULT '' NOT NULL,
	"medications" text DEFAULT '' NOT NULL,
	"surgical_history" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_conditions" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"stoma_type" text,
	"started_at" timestamp with time zone,
	"notes" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condition_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"condition_id" text NOT NULL,
	"length_mm" integer,
	"width_mm" integer,
	"depth_mm" integer,
	"tissue_type" text,
	"exudate" text,
	"pain_scale" integer,
	"skin_condition" text,
	"complications" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evolution_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"appointment_id" text,
	"subjective" text DEFAULT '' NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"assessment" text DEFAULT '' NOT NULL,
	"plan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"appointment_id" text,
	"due_date" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"supply_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"min_qty" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anamneses" ADD CONSTRAINT "anamneses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_conditions" ADD CONSTRAINT "clinical_conditions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD CONSTRAINT "condition_assessments_condition_id_clinical_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."clinical_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_notes" ADD CONSTRAINT "evolution_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clinical_conditions_patient" ON "clinical_conditions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_condition_assessments_condition" ON "condition_assessments" USING btree ("condition_id");--> statement-breakpoint
CREATE INDEX "idx_evolution_notes_patient" ON "evolution_notes" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_status" ON "follow_ups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_due_date" ON "follow_ups" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_supply" ON "stock_movements" USING btree ("supply_id");
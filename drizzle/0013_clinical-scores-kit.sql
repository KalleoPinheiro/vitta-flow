CREATE TABLE "procedure_supplies" (
	"procedure_id" text NOT NULL,
	"supply_id" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "complication_codes" text;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "det_discoloration_area" integer;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "det_discoloration_severity" integer;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "det_erosion_area" integer;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "det_erosion_severity" integer;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "det_overgrowth_area" integer;--> statement-breakpoint
ALTER TABLE "condition_assessments" ADD COLUMN "det_overgrowth_severity" integer;--> statement-breakpoint
ALTER TABLE "procedure_supplies" ADD CONSTRAINT "procedure_supplies_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_procedure_supplies" ON "procedure_supplies" USING btree ("procedure_id","supply_id");
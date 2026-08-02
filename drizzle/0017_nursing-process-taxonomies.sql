CREATE TABLE "care_plan_diagnoses" (
	"id" text PRIMARY KEY NOT NULL,
	"care_plan_id" text NOT NULL,
	"diagnosis_code" text NOT NULL,
	"type" text NOT NULL,
	"related_factors" text,
	"defining_characteristics" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_plan_interventions" (
	"id" text PRIMARY KEY NOT NULL,
	"care_plan_id" text NOT NULL,
	"intervention_code" text NOT NULL,
	"frequency" text NOT NULL,
	"priority" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_plan_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"care_plan_id" text NOT NULL,
	"outcome_code" text NOT NULL,
	"baseline_score" integer NOT NULL,
	"target_score" integer NOT NULL,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"condition_id" text,
	"professional_id" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_records" (
	"id" text PRIMARY KEY NOT NULL,
	"intervention_id" text NOT NULL,
	"professional_id" text,
	"notes" text,
	"performed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nursing_diagnoses" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"domain" text NOT NULL,
	"class" text NOT NULL,
	"definition" text,
	"edition" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nursing_interventions" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"domain" text NOT NULL,
	"class" text NOT NULL,
	"edition" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nursing_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"domain" text NOT NULL,
	"class" text NOT NULL,
	"edition" text NOT NULL,
	"scale_anchor_1" text NOT NULL,
	"scale_anchor_2" text NOT NULL,
	"scale_anchor_3" text NOT NULL,
	"scale_anchor_4" text NOT NULL,
	"scale_anchor_5" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outcome_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"outcome_id" text NOT NULL,
	"score" integer NOT NULL,
	"professional_id" text,
	"notes" text,
	"evaluated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_linkages" (
	"diagnosis_code" text NOT NULL,
	"role" text NOT NULL,
	"target_code" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_plan_diagnoses" ADD CONSTRAINT "care_plan_diagnoses_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_interventions" ADD CONSTRAINT "care_plan_interventions_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_outcomes" ADD CONSTRAINT "care_plan_outcomes_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_condition_id_clinical_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."clinical_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_intervention_id_care_plan_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."care_plan_interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ADD CONSTRAINT "outcome_evaluations_outcome_id_care_plan_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."care_plan_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_evaluations" ADD CONSTRAINT "outcome_evaluations_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_care_plan_diagnoses_plan" ON "care_plan_diagnoses" USING btree ("care_plan_id");--> statement-breakpoint
CREATE INDEX "idx_care_plan_interventions_plan" ON "care_plan_interventions" USING btree ("care_plan_id");--> statement-breakpoint
CREATE INDEX "idx_care_plan_outcomes_plan" ON "care_plan_outcomes" USING btree ("care_plan_id");--> statement-breakpoint
CREATE INDEX "idx_care_plans_patient" ON "care_plans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_care_plans_condition" ON "care_plans" USING btree ("condition_id");--> statement-breakpoint
CREATE INDEX "idx_intervention_records_intervention" ON "intervention_records" USING btree ("intervention_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nursing_diagnoses_code_edition" ON "nursing_diagnoses" USING btree ("code","edition");--> statement-breakpoint
CREATE INDEX "idx_nursing_diagnoses_label" ON "nursing_diagnoses" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nursing_interventions_code_edition" ON "nursing_interventions" USING btree ("code","edition");--> statement-breakpoint
CREATE INDEX "idx_nursing_interventions_label" ON "nursing_interventions" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_nursing_outcomes_code_edition" ON "nursing_outcomes" USING btree ("code","edition");--> statement-breakpoint
CREATE INDEX "idx_nursing_outcomes_label" ON "nursing_outcomes" USING btree ("label");--> statement-breakpoint
CREATE INDEX "idx_outcome_evaluations_outcome" ON "outcome_evaluations" USING btree ("outcome_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_taxonomy_linkages" ON "taxonomy_linkages" USING btree ("diagnosis_code","role","target_code");--> statement-breakpoint
CREATE INDEX "idx_taxonomy_linkages_diagnosis" ON "taxonomy_linkages" USING btree ("diagnosis_code");
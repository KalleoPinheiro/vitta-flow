CREATE TABLE "condition_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"condition_id" text NOT NULL,
	"assessment_id" text,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "condition_photos" ADD CONSTRAINT "condition_photos_condition_id_clinical_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."clinical_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_condition_photos_condition" ON "condition_photos" USING btree ("condition_id");
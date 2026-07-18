CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_role" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"patient_id" text,
	"detail" text,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_audit_events_patient" ON "audit_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_occurred_at" ON "audit_events" USING btree ("occurred_at");
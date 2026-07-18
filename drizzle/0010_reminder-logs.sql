CREATE TABLE "reminder_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"reference_id" text NOT NULL,
	"sent_on" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reminder_logs_daily" ON "reminder_logs" USING btree ("kind","reference_id","sent_on");
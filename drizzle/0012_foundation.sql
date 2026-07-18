CREATE TABLE "procedures" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"weekdays" text NOT NULL,
	"start_hour" integer NOT NULL,
	"end_hour" integer NOT NULL,
	"min_gap_minutes" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"professional_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "procedure_id" text;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_procedures_name" ON "procedures" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE no action ON UPDATE no action;
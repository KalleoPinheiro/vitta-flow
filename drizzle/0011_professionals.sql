CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"registry" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "professional_id" text;--> statement-breakpoint
ALTER TABLE "evolution_notes" ADD COLUMN "professional_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_notes" ADD CONSTRAINT "evolution_notes_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_professional" ON "appointments" USING btree ("professional_id");
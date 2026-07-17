CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"crm" text,
	"specialty" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "partners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "referred_by_partner_id" text;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_referred_by_partner_id_partners_id_fk" FOREIGN KEY ("referred_by_partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_patients_referrer" ON "patients" USING btree ("referred_by_partner_id");
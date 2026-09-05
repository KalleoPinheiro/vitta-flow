ALTER TABLE "google_accounts" DROP CONSTRAINT "google_accounts_pkey";--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "clinic_id" text;--> statement-breakpoint
UPDATE "google_accounts" SET "id" = 'system:' || "email" WHERE "id" IS NULL;--> statement-breakpoint
ALTER TABLE "google_accounts" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_google_accounts_clinic" ON "google_accounts" USING btree ("clinic_id");

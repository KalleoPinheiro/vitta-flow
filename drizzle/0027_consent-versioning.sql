ALTER TABLE "consent_records" ADD COLUMN "kind" text DEFAULT 'accept' NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "text_version" text;
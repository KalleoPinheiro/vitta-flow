ALTER TABLE "user_accounts" ALTER COLUMN "clinic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accounts" ADD COLUMN "role" text;--> statement-breakpoint
UPDATE "user_accounts" SET "role" = 'company_admin' WHERE "role" IS NULL;--> statement-breakpoint
ALTER TABLE "user_accounts" ALTER COLUMN "role" SET NOT NULL;

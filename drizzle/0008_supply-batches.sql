CREATE TABLE "supply_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"supply_id" text NOT NULL,
	"label" text,
	"expires_at" timestamp with time zone,
	"quantity" integer NOT NULL,
	"remaining" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supply_batches" ADD CONSTRAINT "supply_batches_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_supply_batches_supply" ON "supply_batches" USING btree ("supply_id");--> statement-breakpoint
CREATE INDEX "idx_supply_batches_expires_at" ON "supply_batches" USING btree ("expires_at");
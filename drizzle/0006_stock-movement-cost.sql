ALTER TABLE "stock_movements" ADD COLUMN "appointment_id" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "unit_price_cents" integer;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stock_movements_appointment" ON "stock_movements" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_stock_movements_created_at" ON "stock_movements" USING btree ("created_at");
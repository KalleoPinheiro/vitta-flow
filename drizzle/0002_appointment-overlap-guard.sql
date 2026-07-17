-- Defesa em profundidade contra double-booking (TOCTOU):
-- garante no banco que duas consultas ativas nunca se sobreponham e que exista
-- folga mínima de 15 minutos entre elas, mesmo sob requisições concorrentes.
--
-- "timestamptz + interval" não é IMMUTABLE (não pode entrar em índice/EXCLUDE),
-- então o fim estendido (+15min) é materializado em coluna mantida por trigger.
ALTER TABLE "appointments" ADD COLUMN "ends_at_buffered" timestamp with time zone;
--> statement-breakpoint
CREATE FUNCTION set_appointment_buffer() RETURNS trigger AS $$
BEGIN
  NEW."ends_at_buffered" := NEW."ends_at" + interval '15 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "appointments_buffer_trigger"
  BEFORE INSERT OR UPDATE ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION set_appointment_buffer();
--> statement-breakpoint
UPDATE "appointments" SET "ends_at_buffered" = "ends_at" + interval '15 minutes';
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "ends_at_buffered" SET NOT NULL;
--> statement-breakpoint
-- [A.start, A.end+15) ∩ [B.start, B.end+15) = ∅  ⇔  gap >= 15min entre consultas ativas.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    tstzrange("starts_at", "ends_at_buffered") WITH &&
  )
  WHERE (status IN ('scheduled', 'confirmed'));

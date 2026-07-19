-- O3.1: conflito de agenda por profissional.
-- Consultas de profissionais DIFERENTES podem coexistir; mesmo profissional
-- mantém a regra de gap de 15min. Consulta sem profissional usa o sentinel
-- '*any*': o banco só a protege contra outras sem profissional — o caso
-- "sem profissional × qualquer" é garantido pela validação de aplicação
-- (findConflicting), com janela TOCTOU residual documentada e aceita.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_overlap";
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    COALESCE("professional_id", '*any*') WITH =,
    tstzrange("starts_at", "ends_at_buffered") WITH &&
  )
  WHERE (status IN ('scheduled', 'confirmed'));

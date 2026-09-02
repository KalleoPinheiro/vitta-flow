-- Saneia duplicatas antes do índice único (CodeRabbit, PR #56): se emissões
-- concorrentes ocorreram antes desta migração, `auth_tokens` pode ter mais de
-- um token não-usado para a mesma conta+propósito. Mantém o mais recente
-- (created_at) e invalida os demais, senão o CREATE UNIQUE INDEX abaixo falha.
UPDATE "auth_tokens" AS t
SET "used_at" = now()
WHERE t."used_at" IS NULL
  AND t."id" <> (
    SELECT t2."id"
    FROM "auth_tokens" AS t2
    WHERE t2."account_id" = t."account_id"
      AND t2."purpose" = t."purpose"
      AND t2."used_at" IS NULL
    ORDER BY t2."created_at" DESC, t2."id" DESC
    LIMIT 1
  );--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auth_tokens_account_purpose_unused" ON "auth_tokens" USING btree ("account_id","purpose") WHERE "auth_tokens"."used_at" IS NULL;

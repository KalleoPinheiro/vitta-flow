-- Saneia duplicatas antes do índice único (CodeRabbit, PR #56): se dois POST
-- concorrentes em /api/auth/bootstrap ocorreram antes desta migração,
-- `user_accounts` pode ter mais de uma conta com clinic_id nulo (mesmo role).
-- O predicado do índice é sobre clinic_id IS NULL — não dá para "invalidar"
-- sem tirar a linha desse conjunto, e reatribuir clinic_id violaria a
-- invariante de que só o papel de sistema tem clinic_id nulo. Mantém a conta
-- mais antiga (created_at — a primeira instalação de fato) e remove as
-- demais (e os auth_tokens delas), senão o CREATE UNIQUE INDEX abaixo falha.
DELETE FROM "auth_tokens" AS t
WHERE t."account_id" IN (
  SELECT u."id"
  FROM "user_accounts" AS u
  WHERE u."clinic_id" IS NULL
    AND u."id" <> (
      SELECT u2."id"
      FROM "user_accounts" AS u2
      WHERE u2."clinic_id" IS NULL
        AND u2."role" = u."role"
      ORDER BY u2."created_at" ASC, u2."id" ASC
      LIMIT 1
    )
);--> statement-breakpoint
DELETE FROM "user_accounts" AS u
WHERE u."clinic_id" IS NULL
  AND u."id" <> (
    SELECT u2."id"
    FROM "user_accounts" AS u2
    WHERE u2."clinic_id" IS NULL
      AND u2."role" = u."role"
    ORDER BY u2."created_at" ASC, u2."id" ASC
    LIMIT 1
  );--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_accounts_single_system_account" ON "user_accounts" USING btree ("role") WHERE "user_accounts"."clinic_id" IS NULL;

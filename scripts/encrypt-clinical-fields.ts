import { eq } from "drizzle-orm";
import { getDb } from "@/infrastructure/persistence/drizzle/db";
import {
  clinicalConditions,
  conditionAssessments,
  evolutionNotes,
} from "@/infrastructure/persistence/drizzle/schema";
import { encryptField, isEncryptedPayload } from "@/lib/auth/crypto";

/**
 * Migração de dado (não de schema) — cifra em repouso as linhas de
 * `evolution_notes`, `clinical_conditions` e `condition_assessments` gravadas
 * antes da issue #72. Roda uma única vez, manualmente via `tsx`, fora do
 * pipeline de `drizzle-kit migrate` (ver design.md — cifrar tudo no boot é
 * risco de timeout).
 *
 * Idempotente: cada campo passa por `isEncryptedPayload` antes de cifrar — se
 * já está no formato `iv.tag.ciphertext`, a linha é pulada. Rodar o script
 * duas vezes não cifra de novo o que já está cifrado.
 */

const BATCH_SIZE = 200;

interface FieldUpdatePlan {
  needsUpdate: boolean;
  encrypted: string | null;
}

/** Decide se um campo precisa ser cifrado (não nulo, não vazio, ainda não cifrado). */
function planField(value: string | null, secret: string): FieldUpdatePlan {
  if (value === null || value === "" || isEncryptedPayload(value)) {
    return { needsUpdate: false, encrypted: value };
  }
  return { needsUpdate: true, encrypted: encryptField(value, secret) };
}

async function encryptEvolutionNotes(db: Awaited<ReturnType<typeof getDb>>, secret: string) {
  let offset = 0;
  let updated = 0;
  for (;;) {
    const rows = await db.select().from(evolutionNotes).limit(BATCH_SIZE).offset(offset);
    if (rows.length === 0) break;

    for (const row of rows) {
      const subjective = planField(row.subjective, secret);
      const objective = planField(row.objective, secret);
      const assessment = planField(row.assessment, secret);
      const plan = planField(row.plan, secret);
      const plans = [subjective, objective, assessment, plan];
      if (!plans.some((field) => field.needsUpdate)) {
        continue;
      }
      await db
        .update(evolutionNotes)
        .set({
          subjective: subjective.encrypted ?? "",
          objective: objective.encrypted ?? "",
          assessment: assessment.encrypted ?? "",
          plan: plan.encrypted ?? "",
        })
        .where(eq(evolutionNotes.id, row.id));
      updated += 1;
    }
    offset += BATCH_SIZE;
  }
  return updated;
}

async function encryptClinicalConditions(db: Awaited<ReturnType<typeof getDb>>, secret: string) {
  let offset = 0;
  let updated = 0;
  for (;;) {
    const rows = await db.select().from(clinicalConditions).limit(BATCH_SIZE).offset(offset);
    if (rows.length === 0) break;

    for (const row of rows) {
      const notes = planField(row.notes, secret);
      if (!notes.needsUpdate) continue;
      await db
        .update(clinicalConditions)
        .set({ notes: notes.encrypted })
        .where(eq(clinicalConditions.id, row.id));
      updated += 1;
    }
    offset += BATCH_SIZE;
  }
  return updated;
}

async function encryptConditionAssessments(db: Awaited<ReturnType<typeof getDb>>, secret: string) {
  let offset = 0;
  let updated = 0;
  for (;;) {
    const rows = await db.select().from(conditionAssessments).limit(BATCH_SIZE).offset(offset);
    if (rows.length === 0) break;

    for (const row of rows) {
      const notes = planField(row.notes, secret);
      if (!notes.needsUpdate) continue;
      await db
        .update(conditionAssessments)
        .set({ notes: notes.encrypted })
        .where(eq(conditionAssessments.id, row.id));
      updated += 1;
    }
    offset += BATCH_SIZE;
  }
  return updated;
}

async function main(): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET ausente — necessário pra cifrar os campos clínicos");
  }

  const db = await getDb();
  const evolutionsUpdated = await encryptEvolutionNotes(db, secret);
  const conditionsUpdated = await encryptClinicalConditions(db, secret);
  const assessmentsUpdated = await encryptConditionAssessments(db, secret);

  console.log(
    `Migração de cifra concluída — evolution_notes: ${evolutionsUpdated} linha(s), ` +
      `clinical_conditions: ${conditionsUpdated} linha(s), condition_assessments: ${assessmentsUpdated} linha(s).`,
  );
}

main().catch((error: unknown) => {
  console.error("Falha ao cifrar campos clínicos existentes:", error);
  process.exitCode = 1;
});

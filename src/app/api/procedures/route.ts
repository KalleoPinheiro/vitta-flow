import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { Procedure } from "@/domain/catalog/procedure";
import { ValidationError } from "@/domain/shared/errors";
import { handleRequest } from "@/lib/api-response";
import { toProcedureDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const procedureSchema = z.object({
  name: z.string().min(1).max(200),
  priceCents: z.number().int().min(0).max(1_000_000_000),
  durationMinutes: z.number().int().min(1).max(480),
});

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { procedures, procedureKits } = await getRepositories({
      clinicId: guard.session?.clinicId ?? null,
    });
    const [result, kitCounts] = await Promise.all([
      procedures.findAll(),
      procedureKits.countByProcedure(),
    ]);
    return result.map((procedure) => toProcedureDto(procedure, kitCounts[procedure.id] ?? 0));
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = procedureSchema.parse(await request.json());
    const { procedures } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });

    const existing = await procedures.findByName(body.name);
    if (existing) {
      throw new ValidationError(`Já existe procedimento com o nome "${existing.name}"`);
    }

    const procedure = Procedure.create(body);
    await procedures.save(procedure);
    return toProcedureDto(procedure);
  });
}

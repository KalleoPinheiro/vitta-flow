import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { NotFoundError } from "@/domain/shared/errors";
import { handleRequest } from "@/lib/api-response";
import { toProfessionalDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const updateSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  registry: z.string().max(100).nullish(),
  commissionPct: z.number().int().min(0).max(100).nullish(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const { professionals } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });

    const existing = await professionals.findById(id);
    if (!existing) {
      throw new NotFoundError("Profissional", id);
    }

    let updated = existing.update({
      fullName: body.fullName,
      registry: body.registry !== undefined ? body.registry : undefined,
      commissionPct: body.commissionPct !== undefined ? body.commissionPct : undefined,
    });
    if (body.active === true) updated = updated.reactivate();
    if (body.active === false) updated = updated.deactivate();

    await professionals.save(updated);
    return toProfessionalDto(updated);
  });
}

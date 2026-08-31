import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { RecordIntervention } from "@/application/clinical/record-intervention";
import { handleRequest } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth/require-session";
import { recordAudit } from "@/lib/audit";
import { toInterventionRecordDto } from "@/lib/dto";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const recordSchema = z.object({
  professionalId: z.string().min(1).nullish(),
  notes: z.string().max(2000).nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const body = recordSchema.parse(await request.json());
    const { interventionRecords, carePlanInterventions, carePlans, auditEvents } =
      await getRepositories({ clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID });
    const record = await new RecordIntervention(
      interventionRecords,
      carePlanInterventions,
      carePlans,
    ).execute({
      interventionId: id,
      professionalId: body.professionalId ?? null,
      notes: body.notes ?? null,
    });
    const intervention = await carePlanInterventions.findById(id);
    const plan = intervention ? await carePlans.findById(intervention.carePlanId) : null;
    recordAudit(auditEvents, guard.session, {
      action: "create",
      resourceType: "intervention_record",
      resourceId: record.id,
      patientId: plan?.patientId ?? null,
    });
    return toInterventionRecordDto(record);
  });
}

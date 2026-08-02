import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { RecordIntervention } from "@/application/clinical/record-intervention";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toInterventionRecordDto } from "@/lib/dto";

const recordSchema = z.object({
  professionalId: z.string().min(1).nullish(),
  notes: z.string().max(2000).nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = recordSchema.parse(await request.json());
    const { interventionRecords, carePlanInterventions, auditEvents } = await getRepositories();
    const record = await new RecordIntervention(interventionRecords, carePlanInterventions).execute({
      interventionId: id,
      professionalId: body.professionalId ?? null,
      notes: body.notes ?? null,
    });
    recordAudit(auditEvents, getRequestSession(request), {
      action: "create",
      resourceType: "intervention_record",
      resourceId: record.id,
    });
    return toInterventionRecordDto(record);
  });
}

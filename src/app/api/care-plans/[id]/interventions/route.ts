import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { PrescribeIntervention } from "@/application/clinical/prescribe-intervention";
import { INTERVENTION_PRIORITIES } from "@/domain/clinical/care-plan-intervention";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toCarePlanInterventionDto } from "@/lib/dto";

const interventionSchema = z.object({
  interventionCode: z.string().min(1).max(20),
  frequency: z.string().min(1).max(500),
  priority: z.enum(INTERVENTION_PRIORITIES),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = interventionSchema.parse(await request.json());
    const { carePlanInterventions, carePlans, nursingInterventions, auditEvents } =
      await getRepositories();
    const intervention = await new PrescribeIntervention(
      carePlanInterventions,
      carePlans,
      nursingInterventions,
    ).execute({
      carePlanId: id,
      interventionCode: body.interventionCode,
      frequency: body.frequency,
      priority: body.priority,
    });
    const [plan, catalogEntry] = await Promise.all([
      carePlans.findById(id),
      nursingInterventions.findByCode(body.interventionCode),
    ]);
    recordAudit(auditEvents, getRequestSession(request), {
      action: "create",
      resourceType: "care_plan_intervention",
      resourceId: intervention.id,
      patientId: plan?.patientId ?? null,
    });
    return toCarePlanInterventionDto(
      intervention,
      [],
      catalogEntry?.label ?? intervention.interventionCode,
    );
  });
}

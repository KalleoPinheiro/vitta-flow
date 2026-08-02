import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { OpenCarePlan } from "@/application/clinical/open-care-plan";
import { ListCarePlansByPatient } from "@/application/clinical/list-care-plans-by-patient";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toCarePlanDto } from "@/lib/dto";

const openCarePlanSchema = z.object({
  conditionId: z.string().min(1).nullish(),
  professionalId: z.string().min(1).nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { carePlans, auditEvents } = await getRepositories();
    const result = await new ListCarePlansByPatient(carePlans).execute({ patientId: id });
    recordAudit(auditEvents, getRequestSession(request), {
      action: "read",
      resourceType: "care_plans",
      resourceId: id,
      patientId: id,
    });
    return result.map(toCarePlanDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = openCarePlanSchema.parse(await request.json());
    const { carePlans, patients, auditEvents } = await getRepositories();
    const plan = await new OpenCarePlan(carePlans, patients).execute({
      patientId: id,
      conditionId: body.conditionId ?? null,
      professionalId: body.professionalId ?? null,
    });
    recordAudit(auditEvents, getRequestSession(request), {
      action: "create",
      resourceType: "care_plan",
      resourceId: plan.id,
      patientId: id,
    });
    return toCarePlanDto(plan);
  });
}

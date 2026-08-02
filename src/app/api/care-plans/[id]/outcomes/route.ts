import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { PrescribeOutcome } from "@/application/clinical/prescribe-outcome";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toCarePlanOutcomeDto } from "@/lib/dto";

const outcomeSchema = z.object({
  outcomeCode: z.string().min(1).max(20),
  baselineScore: z.number().int().min(1).max(5),
  targetScore: z.number().int().min(1).max(5),
  deadline: z.iso.datetime().nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = outcomeSchema.parse(await request.json());
    const { carePlanOutcomes, carePlans, nursingOutcomes, auditEvents } = await getRepositories();
    const outcome = await new PrescribeOutcome(carePlanOutcomes, carePlans, nursingOutcomes).execute({
      carePlanId: id,
      outcomeCode: body.outcomeCode,
      baselineScore: body.baselineScore,
      targetScore: body.targetScore,
      deadline: body.deadline ? new Date(body.deadline) : null,
    });
    const [plan, catalogEntry] = await Promise.all([
      carePlans.findById(id),
      nursingOutcomes.findByCode(body.outcomeCode),
    ]);
    recordAudit(auditEvents, getRequestSession(request), {
      action: "create",
      resourceType: "care_plan_outcome",
      resourceId: outcome.id,
      patientId: plan?.patientId ?? null,
    });
    return toCarePlanOutcomeDto(outcome, [], catalogEntry);
  });
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ResolveCondition } from "@/application/clinical/resolve-condition";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toConditionDto } from "@/lib/dto";

const actionSchema = z.object({ action: z.literal("resolve") });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { conditions, auditEvents } = await getRepositories();
    const condition = await conditions.findById(id);
    if (!condition) {
      return null;
    }
    recordAudit(auditEvents, getRequestSession(request), {
      action: "read",
      resourceType: "condition",
      resourceId: condition.id,
      patientId: condition.patientId,
    });
    return toConditionDto(condition);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    actionSchema.parse(await request.json());
    const { conditions, auditEvents } = await getRepositories();
    const condition = await new ResolveCondition(conditions).execute({ id });
    recordAudit(auditEvents, getRequestSession(request), {
      action: "update",
      resourceType: "condition",
      resourceId: condition.id,
      patientId: condition.patientId,
      detail: "resolvida",
    });
    return toConditionDto(condition);
  });
}

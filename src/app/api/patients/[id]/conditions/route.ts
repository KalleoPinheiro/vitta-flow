import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreateCondition } from "@/application/clinical/create-condition";
import { ListConditions } from "@/application/clinical/list-conditions";
import { CONDITION_KINDS, STOMA_TYPES } from "@/domain/clinical/clinical-condition";
import { handleRequest } from "@/lib/api-response";
import { toConditionDto } from "@/lib/dto";

const conditionSchema = z.object({
  kind: z.enum(CONDITION_KINDS),
  title: z.string().min(1),
  stomaType: z.enum(STOMA_TYPES).nullish(),
  startedAt: z.iso.datetime().nullish(),
  notes: z.string().nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { conditions } = await getRepositories();
    const result = await new ListConditions(conditions).execute({ patientId: id });
    return result.map(toConditionDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = conditionSchema.parse(await request.json());
    const { conditions, patients } = await getRepositories();
    const condition = await new CreateCondition(conditions, patients).execute({
      patientId: id,
      kind: body.kind,
      title: body.title,
      stomaType: body.stomaType ?? null,
      startedAt: body.startedAt ? new Date(body.startedAt) : null,
      notes: body.notes ?? null,
    });
    return toConditionDto(condition);
  });
}

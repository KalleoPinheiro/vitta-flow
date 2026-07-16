import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ResolveCondition } from "@/application/clinical/resolve-condition";
import { handleRequest } from "@/lib/api-response";
import { toConditionDto } from "@/lib/dto";

const actionSchema = z.object({ action: z.literal("resolve") });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    actionSchema.parse(await request.json());
    const { conditions } = await getRepositories();
    return toConditionDto(await new ResolveCondition(conditions).execute({ id }));
  });
}

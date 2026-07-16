import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { SetFollowUpStatus } from "@/application/followups/set-follow-up-status";
import { handleRequest } from "@/lib/api-response";
import { toFollowUpDto } from "@/lib/dto";

const patchSchema = z.object({ status: z.enum(["done", "cancelled"]) });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const { followUps } = await getRepositories();
    return toFollowUpDto(
      await new SetFollowUpStatus(followUps).execute({ id, status: body.status }),
    );
  });
}

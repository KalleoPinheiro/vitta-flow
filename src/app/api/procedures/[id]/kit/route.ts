import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { NotFoundError } from "@/domain/shared/errors";
import { handleRequest } from "@/lib/api-response";

const kitSchema = z.object({
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(1000),
      }),
    )
    .max(50),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { procedureKits } = await getRepositories();
    return { items: await procedureKits.getKit(id) };
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = kitSchema.parse(await request.json());
    const { procedureKits, procedures } = await getRepositories();

    const procedure = await procedures.findById(id);
    if (!procedure) {
      throw new NotFoundError("Procedimento", id);
    }

    await procedureKits.setKit(id, body.items);
    return { items: await procedureKits.getKit(id) };
  });
}

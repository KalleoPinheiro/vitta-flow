import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreateSupply } from "@/application/inventory/create-supply";
import { ListSupplies } from "@/application/inventory/list-supplies";
import { handleRequest } from "@/lib/api-response";
import { toSupplyDto } from "@/lib/dto";

const supplySchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  minQty: z.number().int().nonnegative(),
  priceCents: z.number().int().nonnegative(),
});

export async function GET() {
  return handleRequest(async () => {
    const { supplies } = await getRepositories();
    const result = await new ListSupplies(supplies).execute();
    return result.map(({ supply }) => toSupplyDto(supply));
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = supplySchema.parse(await request.json());
    const { supplies } = await getRepositories();
    return toSupplyDto(await new CreateSupply(supplies).execute(body));
  });
}

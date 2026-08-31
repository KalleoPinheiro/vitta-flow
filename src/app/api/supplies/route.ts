import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreateSupply } from "@/application/inventory/create-supply";
import { ListSupplies } from "@/application/inventory/list-supplies";
import { handleRequest } from "@/lib/api-response";
import { toSupplyDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";

const supplySchema = z.object({
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(20),
  minQty: z.number().int().nonnegative().max(1_000_000),
  priceCents: z.number().int().nonnegative().max(1_000_000_000),
});

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { supplies } = await getRepositories({ clinicId: null });
    const result = await new ListSupplies(supplies).execute();
    return result.map(({ supply }) => toSupplyDto(supply));
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = supplySchema.parse(await request.json());
    const { supplies } = await getRepositories({ clinicId: null });
    return toSupplyDto(await new CreateSupply(supplies).execute(body));
  });
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { RegisterStockMovement } from "@/application/inventory/register-stock-movement";
import { MOVEMENT_TYPES } from "@/domain/inventory/stock-movement";
import { handleRequest } from "@/lib/api-response";
import { toStockMovementDto, toSupplyDto } from "@/lib/dto";

const movementSchema = z.object({
  type: z.enum(MOVEMENT_TYPES),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().min(1).max(500),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { stockMovements } = await getRepositories();
    const movements = await stockMovements.findBySupplyId(id);
    return movements.map(toStockMovementDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = movementSchema.parse(await request.json());
    const { supplies, stockMovements } = await getRepositories();
    const supply = await new RegisterStockMovement(supplies, stockMovements).execute({
      supplyId: id,
      ...body,
    });
    return toSupplyDto(supply);
  });
}

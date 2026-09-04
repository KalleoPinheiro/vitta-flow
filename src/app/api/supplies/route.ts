import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { CreateSupply } from '@/application/inventory/create-supply';
import { ListSupplies } from '@/application/inventory/list-supplies';
import { getRepositories } from '@/infrastructure/container';
import { LEGACY_CLINIC_ID } from '@/infrastructure/persistence/drizzle/legacy-clinic';
import { handleRequest } from '@/lib/api-response';
import { requireStaffSession } from '@/lib/auth/require-session';
import { toSupplyDto } from '@/lib/dto';

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
    const { supplies } = await getRepositories({
      clinicId: guard.session?.clinicId ?? null,
    });
    const result = await new ListSupplies(supplies).execute();
    return result.map(({ supply }) => toSupplyDto(supply));
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = supplySchema.parse(await request.json());
    const { supplies } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });
    return toSupplyDto(await new CreateSupply(supplies).execute(body));
  });
}

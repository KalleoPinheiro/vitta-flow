import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { UpdatePartner } from "@/application/partners/update-partner";
import { handleRequest } from "@/lib/api-response";
import { toPartnerDto } from "@/lib/dto";

const updateSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  crm: z.string().max(50).nullish(),
  specialty: z.string().max(200).nullish(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const { partners } = await getRepositories();
    const partner = await new UpdatePartner(partners).execute({
      id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      crm: body.crm === undefined ? undefined : body.crm,
      specialty: body.specialty === undefined ? undefined : body.specialty,
      active: body.active,
    });
    return toPartnerDto(partner);
  });
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreatePartner } from "@/application/partners/create-partner";
import { ListPartners } from "@/application/partners/list-partners";
import { handleRequest } from "@/lib/api-response";
import { toPartnerDto } from "@/lib/dto";

const partnerSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().min(1).max(200),
  phone: z.string().min(1).max(50),
  crm: z.string().max(50).nullish(),
  specialty: z.string().max(200).nullish(),
});

export async function GET() {
  return handleRequest(async () => {
    const { partners } = await getRepositories();
    const result = await new ListPartners(partners).execute();
    return result.map(toPartnerDto);
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = partnerSchema.parse(await request.json());
    const { partners } = await getRepositories();
    const partner = await new CreatePartner(partners).execute({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      crm: body.crm ?? null,
      specialty: body.specialty ?? null,
    });
    return toPartnerDto(partner);
  });
}

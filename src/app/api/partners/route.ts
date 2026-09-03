import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreatePartner } from "@/application/partners/create-partner";
import { ListPartners } from "@/application/partners/list-partners";
import { handleRequest } from "@/lib/api-response";
import { toPartnerDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const partnerSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().min(1).max(200).email("Email inválido"),
  phone: z.string().min(1).max(50),
  crm: z.string().max(50).nullish(),
  specialty: z.string().max(200).nullish(),
});

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { partners } = await getRepositories({ clinicId: guard.session?.clinicId ?? null });
    const result = await new ListPartners(partners).execute();
    return result.map(toPartnerDto);
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = partnerSchema.parse(await request.json());
    const { partners } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });
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

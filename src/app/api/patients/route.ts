import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreatePatient } from "@/application/patients/create-patient";
import { ListPatients } from "@/application/patients/list-patients";
import { handleRequest } from "@/lib/api-response";
import { toPatientDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const createPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().min(1).max(200),
  phone: z.string().min(1).max(50),
  birthDate: z.iso.datetime().nullish(),
  notes: z.string().max(5000).nullish(),
  referredByPartnerId: z.string().max(100).nullish(),
});

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const params = request.nextUrl.searchParams;
    const search = params.get("search") ?? undefined;
    const { limit, offset } = paginationSchema.parse({
      limit: params.get("limit") ?? undefined,
      offset: params.get("offset") ?? undefined,
    });
    const { patients } = await getRepositories();
    const result = await new ListPatients(patients).execute({ search, limit, offset });
    return result.map((p) => toPatientDto(p));
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = createPatientSchema.parse(await request.json());
    const { patients, partners } = await getRepositories();
    const patient = await new CreatePatient(patients, partners).execute({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      notes: body.notes ?? null,
      referredByPartnerId: body.referredByPartnerId ?? null,
    });
    return toPatientDto(patient);
  });
}

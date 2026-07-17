import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreatePatient } from "@/application/patients/create-patient";
import { ListPatients } from "@/application/patients/list-patients";
import { handleRequest } from "@/lib/api-response";
import { toPatientDto } from "@/lib/dto";

const createPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().min(1).max(200),
  phone: z.string().min(1).max(50),
  birthDate: z.iso.datetime().nullish(),
  notes: z.string().max(5000).nullish(),
});

export async function GET(request: NextRequest) {
  return handleRequest(async () => {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const { patients } = await getRepositories();
    const result = await new ListPatients(patients).execute({ search });
    return result.map((p) => toPatientDto(p));
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = createPatientSchema.parse(await request.json());
    const { patients } = await getRepositories();
    const patient = await new CreatePatient(patients).execute({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      notes: body.notes ?? null,
    });
    return toPatientDto(patient);
  });
}

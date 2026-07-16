import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { GetPatient } from "@/application/patients/get-patient";
import { UpdatePatient } from "@/application/patients/update-patient";
import { SetPatientActive } from "@/application/patients/set-patient-active";
import { handleRequest } from "@/lib/api-response";
import { toPatientDto } from "@/lib/dto";

const updatePatientSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  birthDate: z.iso.datetime().nullish(),
  notes: z.string().nullish(),
});

const setActiveSchema = z.object({
  active: z.boolean(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { patients } = await getRepositories();
    return toPatientDto(await new GetPatient(patients).execute({ id }));
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = updatePatientSchema.parse(await request.json());
    const { patients } = await getRepositories();
    const patient = await new UpdatePatient(patients).execute({
      id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      birthDate: body.birthDate === undefined ? undefined : body.birthDate ? new Date(body.birthDate) : null,
      notes: body.notes === undefined ? undefined : body.notes,
    });
    return toPatientDto(patient);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = setActiveSchema.parse(await request.json());
    const { patients } = await getRepositories();
    const patient = await new SetPatientActive(patients).execute({ id, active: body.active });
    return toPatientDto(patient);
  });
}

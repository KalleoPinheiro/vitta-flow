import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreatePatient } from "@/application/patients/create-patient";
import { ListPatients } from "@/application/patients/list-patients";
import { handleRequest } from "@/lib/api-response";
import { toPatientDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";
import { ensureLinkBestEffort } from "@/lib/patient-link";

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
    const { patients, professionalPatientLinks } = await getRepositories({
      clinicId: guard.session?.clinicId ?? null,
    });
    // Escopo dinâmico do Profissional (R4/RBAC-17): a listagem só mostra
    // pacientes com quem o profissional tem vínculo registrado.
    let allowedPatientIds: string[] | undefined;
    if (guard.session?.role === "profissional") {
      allowedPatientIds = guard.session.professionalId
        ? await professionalPatientLinks.findLinkedPatientIds(guard.session.professionalId)
        : [];
    }
    const result = await new ListPatients(patients).execute({
      search,
      limit,
      offset,
      allowedPatientIds,
    });
    return result.map((p) => toPatientDto(p));
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = createPatientSchema.parse(await request.json());
    const { patients, partners, professionalPatientLinks } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });
    const patient = await new CreatePatient(patients, partners).execute({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      notes: body.notes ?? null,
      referredByPartnerId: body.referredByPartnerId ?? null,
    });
    // Profissional que cadastra um paciente ganha acesso imediato a ele,
    // mesmo antes de qualquer agendamento (RBAC-17/18).
    if (guard.session?.role === "profissional" && guard.session.professionalId) {
      await ensureLinkBestEffort(professionalPatientLinks, guard.session.professionalId, patient.id);
    }
    return toPatientDto(patient);
  });
}

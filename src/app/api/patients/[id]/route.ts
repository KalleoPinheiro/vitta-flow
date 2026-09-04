import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { GetPatient } from '@/application/patients/get-patient';
import { SetPatientActive } from '@/application/patients/set-patient-active';
import { UpdatePatient } from '@/application/patients/update-patient';
import { getRepositories } from '@/infrastructure/container';
import { LEGACY_CLINIC_ID } from '@/infrastructure/persistence/drizzle/legacy-clinic';
import { handleRequest } from '@/lib/api-response';
import { recordAudit } from '@/lib/audit';
import { assertPatientAccessibleToProfessional } from '@/lib/auth/professional-patient-scope';
import { requireStaffSession } from '@/lib/auth/require-session';
import { toPatientDto } from '@/lib/dto';

const updatePatientSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  birthDate: z.iso.datetime().nullish(),
  notes: z.string().max(5000).nullish(),
  referredByPartnerId: z.string().max(100).nullish(),
});

const setActiveSchema = z.object({
  active: z.boolean(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const { patients, auditEvents, professionalPatientLinks } =
      await getRepositories({
        clinicId: guard.session?.clinicId ?? null,
      });
    await assertPatientAccessibleToProfessional(
      guard.session,
      id,
      professionalPatientLinks,
    );
    const patient = await new GetPatient(patients).execute({ id });
    const clinicId = await patients.findClinicIdById(patient.id);
    recordAudit(auditEvents, guard.session, {
      action: 'read',
      resourceType: 'patient',
      resourceId: patient.id,
      patientId: patient.id,
      clinicId,
    });
    return toPatientDto(patient);
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const body = updatePatientSchema.parse(await request.json());
    const { patients, partners, professionalPatientLinks } =
      await getRepositories({
        clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
      });
    await assertPatientAccessibleToProfessional(
      guard.session,
      id,
      professionalPatientLinks,
    );
    const patient = await new UpdatePatient(patients, partners).execute({
      id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      birthDate:
        body.birthDate === undefined
          ? undefined
          : body.birthDate
            ? new Date(body.birthDate)
            : null,
      notes: body.notes === undefined ? undefined : body.notes,
      referredByPartnerId:
        body.referredByPartnerId === undefined
          ? undefined
          : body.referredByPartnerId,
    });
    return toPatientDto(patient);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const body = setActiveSchema.parse(await request.json());
    const { patients, professionalPatientLinks } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });
    await assertPatientAccessibleToProfessional(
      guard.session,
      id,
      professionalPatientLinks,
    );
    const patient = await new SetPatientActive(patients).execute({
      id,
      active: body.active,
    });
    return toPatientDto(patient);
  });
}

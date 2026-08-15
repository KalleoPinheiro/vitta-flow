import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { GetPatientPortalData } from "@/application/portal/get-patient-portal-data";
import { requireRole } from "@/lib/auth/guard";
import { handleRequest } from "@/lib/api-response";
import { recordAudit } from "@/lib/audit";
import {
  toAssessmentDto,
  toConditionDto,
  toConditionPhotoDto,
  toFollowUpDto,
  toInvoiceDto,
  toPortalAppointmentDto,
  toPortalPatientProfileDto,
} from "@/lib/dto";

export async function GET(request: NextRequest) {
  const { session, error } = requireRole(request, "patient");
  if (error) {
    return error;
  }

  return handleRequest(async () => {
    const {
      patients,
      appointments,
      conditions,
      assessments,
      invoices,
      followUps,
      conditionPhotos,
    } = await getRepositories();
    const data = await new GetPatientPortalData(
      patients,
      appointments,
      conditions,
      assessments,
      invoices,
      followUps,
      conditionPhotos,
    ).execute({ email: session.subject });

    recordAudit((await getRepositories()).auditEvents, session, {
      action: "read",
      resourceType: "portal-patient",
      resourceId: data.patient.id,
      patientId: data.patient.id,
    });
    return {
      patient: toPortalPatientProfileDto(data.patient),
      appointments: data.appointments.map(toPortalAppointmentDto),
      conditions: data.conditions.map(({ condition, assessments: list, photos }) => ({
        condition: toConditionDto(condition),
        assessments: list.map(toAssessmentDto),
        photos: (photos ?? []).map(toConditionPhotoDto),
      })),
      invoices: data.invoices.map((i) => toInvoiceDto(i)),
      followUps: data.followUps.map((f) => toFollowUpDto(f)),
    };
  });
}

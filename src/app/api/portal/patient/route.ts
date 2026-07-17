import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { GetPatientPortalData } from "@/application/portal/get-patient-portal-data";
import { getRequestSession } from "@/lib/auth/request-session";
import { handleRequest, fail } from "@/lib/api-response";
import {
  toAssessmentDto,
  toConditionDto,
  toFollowUpDto,
  toInvoiceDto,
  toPortalAppointmentDto,
  toPortalPatientProfileDto,
} from "@/lib/dto";

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) {
    return fail("Não autenticado", 401);
  }
  if (session.role !== "patient") {
    return fail("Rota exclusiva do portal do paciente", 403);
  }

  return handleRequest(async () => {
    const { patients, appointments, conditions, assessments, invoices, followUps } =
      await getRepositories();
    const data = await new GetPatientPortalData(
      patients,
      appointments,
      conditions,
      assessments,
      invoices,
      followUps,
    ).execute({ email: session.subject });

    return {
      patient: toPortalPatientProfileDto(data.patient),
      appointments: data.appointments.map(toPortalAppointmentDto),
      conditions: data.conditions.map(({ condition, assessments: list }) => ({
        condition: toConditionDto(condition),
        assessments: list.map(toAssessmentDto),
      })),
      invoices: data.invoices.map((i) => toInvoiceDto(i)),
      followUps: data.followUps.map((f) => toFollowUpDto(f)),
    };
  });
}

import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { GetPartnerPortalData } from "@/application/portal/get-partner-portal-data";
import { requirePortalSession } from "@/lib/auth/require-session";
import { handleRequest } from "@/lib/api-response";
import { recordAudit } from "@/lib/audit";
import {
  toPartnerDto,
  toPortalAppointmentDto,
  toPortalAssessmentDto,
  toPortalConditionDto,
  toReferredPatientSummaryDto,
} from "@/lib/dto";

export async function GET(request: NextRequest) {
  const guard = requirePortalSession(request, "partner");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  return handleRequest(async () => {
    const { partners, patients, appointments, conditions, assessments } =
      await getRepositories({ clinicId: null });
    const data = await new GetPartnerPortalData(
      partners,
      patients,
      appointments,
      conditions,
      assessments,
    ).execute({ email: session.subject });

    recordAudit((await getRepositories({ clinicId: null })).auditEvents, session, {
      action: "read",
      resourceType: "portal-partner",
      resourceId: data.partner.id,
      detail: `pacientes indicados: ${data.referredPatients.length}`,
    });
    return {
      partner: toPartnerDto(data.partner),
      referredPatients: data.referredPatients.map((entry) => ({
        patient: toReferredPatientSummaryDto(entry.patient),
        appointments: entry.appointments.map(toPortalAppointmentDto),
        conditions: entry.conditions.map(({ condition, assessments: list }) => ({
          condition: toPortalConditionDto(condition),
          assessments: list.map(toPortalAssessmentDto),
        })),
      })),
    };
  });
}

import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { ConfirmOwnAppointment } from "@/application/portal/confirm-own-appointment";
import { requirePortalSession } from "@/lib/auth/require-session";
import { handleRequest } from "@/lib/api-response";
import { toPortalAppointmentDto } from "@/lib/dto";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = requirePortalSession(request, "patient");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  return handleRequest(async () => {
    const { id } = await context.params;
    const { patients, appointments } = await getRepositories({
      clinicId: session.clinicId ?? LEGACY_CLINIC_ID,
    });
    const confirmed = await new ConfirmOwnAppointment(patients, appointments).execute({
      email: session.subject,
      appointmentId: id,
    });
    return toPortalAppointmentDto(confirmed);
  });
}

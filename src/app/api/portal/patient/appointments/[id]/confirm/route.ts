import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { ConfirmOwnAppointment } from "@/application/portal/confirm-own-appointment";
import { requireRole } from "@/lib/auth/guard";
import { handleRequest } from "@/lib/api-response";
import { toPortalAppointmentDto } from "@/lib/dto";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { session, error } = requireRole(request, "patient");
  if (error) {
    return error;
  }

  return handleRequest(async () => {
    const { id } = await context.params;
    const { patients, appointments } = await getRepositories();
    const confirmed = await new ConfirmOwnAppointment(patients, appointments).execute({
      email: session.subject,
      appointmentId: id,
    });
    return toPortalAppointmentDto(confirmed);
  });
}

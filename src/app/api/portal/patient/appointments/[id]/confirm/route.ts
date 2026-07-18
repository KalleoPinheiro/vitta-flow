import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { ConfirmOwnAppointment } from "@/application/portal/confirm-own-appointment";
import { getRequestSession } from "@/lib/auth/request-session";
import { handleRequest, fail } from "@/lib/api-response";
import { toPortalAppointmentDto } from "@/lib/dto";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = getRequestSession(request);
  if (!session) {
    return fail("Não autenticado", 401);
  }
  if (session.role !== "patient") {
    return fail("Rota exclusiva do portal do paciente", 403);
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

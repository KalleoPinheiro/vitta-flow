import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ScheduleOwnAppointment } from "@/application/portal/schedule-own-appointment";
import { requirePortalSession } from "@/lib/auth/require-session";
import { handleRequest } from "@/lib/api-response";
import { recordAudit } from "@/lib/audit";
import { scheduleCalendarSync } from "@/lib/calendar-sync";
import { toPortalAppointmentDto } from "@/lib/dto";

const scheduleSchema = z.object({
  procedureId: z.string().min(1),
  startsAt: z.iso.datetime(),
  followUpId: z.string().min(1).nullish(),
});

/** Auto-agendamento de retorno pelo paciente (PORT4-04..08). */
export async function POST(request: NextRequest) {
  const guard = requirePortalSession(request, "patient");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  return handleRequest(async () => {
    const body = scheduleSchema.parse(await request.json());
    const services = await getRepositories();

    const appointment = await new ScheduleOwnAppointment(
      services.patients,
      services.appointments,
      services.procedures,
      services.followUps,
      services.scheduleConfig,
    ).execute({
      email: session.subject,
      procedureId: body.procedureId,
      startsAt: new Date(body.startsAt),
      followUpId: body.followUpId ?? null,
    });

    recordAudit(services.auditEvents, session, {
      action: "create",
      resourceType: "appointment",
      resourceId: appointment.id,
      patientId: appointment.patientId,
      detail: "agendado pelo portal do paciente",
    });
    scheduleCalendarSync(services, (sync) => sync.created(appointment.id));
    return toPortalAppointmentDto(appointment);
  });
}

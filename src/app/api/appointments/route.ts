import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ScheduleAppointment } from "@/application/appointments/schedule-appointment";
import { ListAppointments } from "@/application/appointments/list-appointments";
import { handleRequest, fail } from "@/lib/api-response";
import { scheduleCalendarSync } from "@/lib/calendar-sync";
import { toAppointmentDto } from "@/lib/dto";

const scheduleSchema = z.object({
  patientId: z.string().min(1),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  procedure: z.string().min(1).max(500),
  priceCents: z.number().int().nonnegative().max(1_000_000_000),
  notes: z.string().max(5000).nullish(),
  professionalId: z.string().max(100).nullish(),
});

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return fail("Parâmetros obrigatórios: from, to (ISO 8601)", 400);
  }
  const professionalId = request.nextUrl.searchParams.get("professionalId") ?? undefined;
  return handleRequest(async () => {
    const { appointments, patients } = await getRepositories();
    const result = await new ListAppointments(appointments, patients).execute({
      from: new Date(from),
      to: new Date(to),
      professionalId,
    });
    return result.map(({ appointment, patientName }) =>
      toAppointmentDto(appointment, patientName),
    );
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = scheduleSchema.parse(await request.json());
    const services = await getRepositories();
    const appointment = await new ScheduleAppointment(
      services.appointments,
      services.patients,
    ).execute({
      patientId: body.patientId,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      procedure: body.procedure,
      priceCents: body.priceCents,
      notes: body.notes ?? null,
      professionalId: body.professionalId ?? null,
    });
    scheduleCalendarSync(services, (sync) => sync.created(appointment.id));
    return toAppointmentDto(appointment);
  });
}

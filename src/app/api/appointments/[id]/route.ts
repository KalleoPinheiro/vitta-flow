import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import {
  ACTIONS_REMOVING_EVENT,
  ChangeAppointmentStatus,
} from "@/application/appointments/change-appointment-status";
import { CompleteAppointment } from "@/application/appointments/complete-appointment";
import { RescheduleAppointment } from "@/application/appointments/reschedule-appointment";
import { handleRequest } from "@/lib/api-response";
import { scheduleCalendarSync } from "@/lib/calendar-sync";
import { toAppointmentDto } from "@/lib/dto";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["confirm", "cancel", "no_show"]) }),
  z.object({
    action: z.literal("complete"),
    followUpInDays: z.number().int().positive().max(365).nullish(),
  }),
  z.object({
    action: z.literal("reschedule"),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { appointments, patients } = await getRepositories();
    const appointment = await appointments.findById(id);
    if (!appointment) {
      return null;
    }
    const patient = await patients.findById(appointment.patientId);
    return toAppointmentDto(appointment, patient?.fullName);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = actionSchema.parse(await request.json());
    const services = await getRepositories();
    const { appointments, invoices, followUps } = services;

    if (body.action === "complete") {
      const completed = await new CompleteAppointment(appointments, invoices, followUps).execute({
        id,
        followUpInDays: body.followUpInDays ?? null,
      });
      return toAppointmentDto(completed);
    }
    if (body.action === "reschedule") {
      const rescheduled = await new RescheduleAppointment(
        appointments,
        services.scheduleConfig,
      ).execute({
        id,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
      });
      scheduleCalendarSync(services, (sync) => sync.rescheduled(rescheduled.id));
      return toAppointmentDto(rescheduled);
    }
    const changed = await new ChangeAppointmentStatus(appointments).execute({
      id,
      action: body.action,
    });
    const eventId = changed.googleEventId;
    if (eventId && ACTIONS_REMOVING_EVENT.includes(body.action)) {
      scheduleCalendarSync(services, (sync) => sync.removed(eventId));
    }
    return toAppointmentDto(changed);
  });
}

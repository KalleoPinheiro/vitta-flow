import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ChangeAppointmentStatus } from "@/application/appointments/change-appointment-status";
import { CompleteAppointment } from "@/application/appointments/complete-appointment";
import { RescheduleAppointment } from "@/application/appointments/reschedule-appointment";
import { handleRequest } from "@/lib/api-response";
import { toAppointmentDto } from "@/lib/dto";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["confirm", "cancel", "no_show"]) }),
  z.object({
    action: z.literal("complete"),
    followUpInDays: z.number().int().positive().nullish(),
  }),
  z.object({
    action: z.literal("reschedule"),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = actionSchema.parse(await request.json());
    const { appointments, invoices, followUps, calendar } = await getRepositories();

    if (body.action === "complete") {
      const completed = await new CompleteAppointment(appointments, invoices, followUps).execute({
        id,
        followUpInDays: body.followUpInDays ?? null,
      });
      return toAppointmentDto(completed);
    }
    if (body.action === "reschedule") {
      const rescheduled = await new RescheduleAppointment(appointments, calendar).execute({
        id,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
      });
      return toAppointmentDto(rescheduled);
    }
    const changed = await new ChangeAppointmentStatus(appointments, calendar).execute({
      id,
      action: body.action,
    });
    return toAppointmentDto(changed);
  });
}

import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import {
  assertWithinBusinessHours,
  MIN_GAP_MINUTES,
} from "@/domain/scheduling/business-hours";
import { TimeSlot } from "@/domain/shared/time-slot";
import { NotFoundError, SchedulingConflictError } from "@/domain/shared/errors";
import {
  NullCalendarGateway,
  type CalendarGateway,
} from "@/application/ports/calendar-gateway";

export interface RescheduleAppointmentInput {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

export class RescheduleAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly calendar: CalendarGateway = new NullCalendarGateway(),
  ) {}

  async execute(input: RescheduleAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.id);
    if (!appointment) {
      throw new NotFoundError("Consulta", input.id);
    }

    const slot = TimeSlot.create(input.startsAt, input.endsAt);
    assertWithinBusinessHours(slot);

    const conflicts = await this.appointments.findConflicting(
      slot.expand(MIN_GAP_MINUTES),
      appointment.id,
    );
    if (conflicts.length > 0) {
      throw new SchedulingConflictError(
        `Horário indisponível: é necessário intervalo mínimo de ${MIN_GAP_MINUTES} minutos entre consultas`,
      );
    }

    const rescheduled = appointment.reschedule(slot);
    await this.appointments.save(rescheduled);

    if (rescheduled.googleEventId) {
      await this.calendar.updateEvent(rescheduled.googleEventId, {
        title: `Consulta remarcada`,
        description: rescheduled.procedure,
        startsAt: slot.start,
        endsAt: slot.end,
      });
    }

    return rescheduled;
  }
}

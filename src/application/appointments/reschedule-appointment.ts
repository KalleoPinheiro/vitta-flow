import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import { TimeSlot } from "@/domain/shared/time-slot";
import { NotFoundError, SchedulingConflictError } from "@/domain/shared/errors";

export interface RescheduleAppointmentInput {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

export class RescheduleAppointment {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: RescheduleAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.id);
    if (!appointment) {
      throw new NotFoundError("Consulta", input.id);
    }

    const slot = TimeSlot.create(input.startsAt, input.endsAt);
    const conflicts = await this.appointments.findConflicting(slot, appointment.id);
    if (conflicts.length > 0) {
      throw new SchedulingConflictError("Já existe consulta nesse horário");
    }

    const rescheduled = appointment.reschedule(slot);
    await this.appointments.save(rescheduled);
    return rescheduled;
  }
}

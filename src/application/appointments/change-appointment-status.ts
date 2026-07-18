import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import { NotFoundError } from "@/domain/shared/errors";

export const APPOINTMENT_STATUS_ACTIONS = ["confirm", "cancel", "no_show"] as const;
export type AppointmentStatusAction = (typeof APPOINTMENT_STATUS_ACTIONS)[number];

export interface ChangeAppointmentStatusInput {
  id: string;
  action: AppointmentStatusAction;
}

export const ACTIONS_REMOVING_EVENT: readonly AppointmentStatusAction[] = [
  "cancel",
  "no_show",
];

export class ChangeAppointmentStatus {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: ChangeAppointmentStatusInput): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.id);
    if (!appointment) {
      throw new NotFoundError("Consulta", input.id);
    }

    const changed = this.apply(appointment, input.action);
    await this.appointments.save(changed);

    // Remoção do evento no Google Calendar acontece fora do request (SyncAppointmentCalendar).
    return changed;
  }

  private apply(appointment: Appointment, action: AppointmentStatusAction): Appointment {
    switch (action) {
      case "confirm":
        return appointment.confirm();
      case "cancel":
        return appointment.cancel();
      case "no_show":
        return appointment.markNoShow();
    }
  }
}

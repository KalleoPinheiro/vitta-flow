import { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import {
  assertWithinBusinessHours,
  MIN_GAP_MINUTES,
} from "@/domain/scheduling/business-hours";
import { Money } from "@/domain/shared/money";
import { TimeSlot } from "@/domain/shared/time-slot";
import {
  NotFoundError,
  SchedulingConflictError,
  ValidationError,
} from "@/domain/shared/errors";
import {
  NullCalendarGateway,
  type CalendarGateway,
} from "@/application/ports/calendar-gateway";

export interface ScheduleAppointmentInput {
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  procedure: string;
  priceCents: number;
  notes?: string | null;
}

export class ScheduleAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly patients: PatientRepository,
    private readonly calendar: CalendarGateway = new NullCalendarGateway(),
  ) {}

  async execute(input: ScheduleAppointmentInput): Promise<Appointment> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError("Paciente", input.patientId);
    }
    if (!patient.isActive) {
      throw new ValidationError("Não é possível agendar consulta para paciente inativo");
    }

    const slot = TimeSlot.create(input.startsAt, input.endsAt);
    assertWithinBusinessHours(slot);

    const conflicts = await this.appointments.findConflicting(slot.expand(MIN_GAP_MINUTES));
    if (conflicts.length > 0) {
      throw new SchedulingConflictError(
        `Horário indisponível: é necessário intervalo mínimo de ${MIN_GAP_MINUTES} minutos entre consultas`,
      );
    }

    const appointment = Appointment.create({
      patientId: input.patientId,
      slot,
      procedure: input.procedure,
      price: Money.fromCents(input.priceCents),
      notes: input.notes,
    });
    await this.appointments.save(appointment);

    const eventId = await this.calendar.createEvent({
      title: `Consulta: ${patient.fullName}`,
      description: `${appointment.procedure}\nPaciente: ${patient.fullName} (${patient.phone})`,
      startsAt: slot.start,
      endsAt: slot.end,
    });
    if (eventId) {
      const withEvent = appointment.withGoogleEventId(eventId);
      await this.appointments.save(withEvent);
      return withEvent;
    }

    return appointment;
  }
}

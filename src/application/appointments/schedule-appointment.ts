import { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { Money } from "@/domain/shared/money";
import { TimeSlot } from "@/domain/shared/time-slot";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";
import { assertSlotAvailable } from "./assert-slot-available";

export interface ScheduleAppointmentInput {
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  procedure: string;
  priceCents: number;
  notes?: string | null;
  professionalId?: string | null;
}

export class ScheduleAppointment {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly patients: PatientRepository,
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
    await assertSlotAvailable(this.appointments, slot);

    const appointment = Appointment.create({
      patientId: input.patientId,
      slot,
      procedure: input.procedure,
      price: Money.fromCents(input.priceCents),
      notes: input.notes,
      professionalId: input.professionalId ?? null,
    });
    await this.appointments.save(appointment);

    // Sincronização com Google Calendar acontece fora do request (SyncAppointmentCalendar).
    return appointment;
  }
}

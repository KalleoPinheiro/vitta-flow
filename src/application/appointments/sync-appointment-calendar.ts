import type { CalendarGateway } from '@/application/ports/calendar-gateway';
import type { PatientRepository } from '@/domain/patient/patient-repository';
import type { AppointmentRepository } from '@/domain/scheduling/appointment-repository';

/**
 * Sincronização com Google Calendar fora do caminho crítico do request.
 * Executada via after() nas rotas: lentidão/indisponibilidade da API do Google
 * não bloqueia nem falha o agendamento já persistido.
 */
export class SyncAppointmentCalendar {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly patients: PatientRepository,
    private readonly calendar: CalendarGateway,
  ) {}

  /** Cria o evento do agendamento e persiste o id externo. */
  async created(appointmentId: string): Promise<void> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment || appointment.googleEventId) {
      return;
    }
    const patient = await this.patients.findById(appointment.patientId);
    const patientLabel = patient
      ? `${patient.fullName} (${patient.phone})`
      : appointment.patientId;

    const eventId = await this.calendar.createEvent({
      title: `Consulta: ${patient?.fullName ?? 'Paciente'}`,
      description: `${appointment.procedure}\nPaciente: ${patientLabel}`,
      startsAt: appointment.slot.start,
      endsAt: appointment.slot.end,
    });
    if (eventId) {
      await this.appointments.save(appointment.withGoogleEventId(eventId));
    }
  }

  /** Atualiza o evento após remarcação. */
  async rescheduled(appointmentId: string): Promise<void> {
    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment?.googleEventId) {
      return;
    }
    await this.calendar.updateEvent(appointment.googleEventId, {
      title: 'Consulta remarcada',
      description: appointment.procedure,
      startsAt: appointment.slot.start,
      endsAt: appointment.slot.end,
    });
  }

  /** Remove o evento após cancelamento/falta. */
  async removed(googleEventId: string): Promise<void> {
    await this.calendar.deleteEvent(googleEventId);
  }
}

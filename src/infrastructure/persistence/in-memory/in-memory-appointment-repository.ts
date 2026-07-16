import type { Appointment } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { TimeSlot } from "@/domain/shared/time-slot";

export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly appointments = new Map<string, Appointment>();

  async save(appointment: Appointment): Promise<void> {
    this.appointments.set(appointment.id, appointment);
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.appointments.get(id) ?? null;
  }

  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return [...this.appointments.values()]
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
  }

  async findInRange(start: Date, end: Date): Promise<Appointment[]> {
    return [...this.appointments.values()]
      .filter((a) => a.slot.start.getTime() < end.getTime() && a.slot.end.getTime() > start.getTime())
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
  }

  async findConflicting(slot: TimeSlot, excludeId?: string): Promise<Appointment[]> {
    return [...this.appointments.values()].filter(
      (a) => a.id !== excludeId && a.isActive && a.slot.overlaps(slot),
    );
  }
}

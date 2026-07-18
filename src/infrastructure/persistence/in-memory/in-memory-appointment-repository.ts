import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentStatus,
} from "@/domain/scheduling/appointment";
import type {
  AppointmentRangeStats,
  AppointmentRepository,
  FindByPatientOptions,
  ProcedureRevenue,
} from "@/domain/scheduling/appointment-repository";
import type { TimeSlot } from "@/domain/shared/time-slot";

export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly appointments = new Map<string, Appointment>();

  async save(appointment: Appointment): Promise<void> {
    this.appointments.set(appointment.id, appointment);
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.appointments.get(id) ?? null;
  }

  private matchesPatientOptions(appointment: Appointment, options?: FindByPatientOptions) {
    return !options?.endsAfter || appointment.slot.end.getTime() >= options.endsAfter.getTime();
  }

  async findByPatientId(
    patientId: string,
    options?: FindByPatientOptions,
  ): Promise<Appointment[]> {
    return [...this.appointments.values()]
      .filter((a) => a.patientId === patientId && this.matchesPatientOptions(a, options))
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
  }

  async findByPatientIds(
    patientIds: string[],
    options?: FindByPatientOptions,
  ): Promise<Appointment[]> {
    const ids = new Set(patientIds);
    return [...this.appointments.values()]
      .filter((a) => ids.has(a.patientId) && this.matchesPatientOptions(a, options))
      .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
  }

  async getStatsInRange(start: Date, end: Date): Promise<AppointmentRangeStats> {
    const inRange = [...this.appointments.values()].filter(
      (a) =>
        a.slot.start.getTime() < end.getTime() && a.slot.end.getTime() > start.getTime(),
    );

    const byStatus = Object.fromEntries(
      APPOINTMENT_STATUSES.map((status) => [status, 0]),
    ) as Record<AppointmentStatus, number>;
    for (const appointment of inRange) {
      byStatus[appointment.status] += 1;
    }

    const revenueMap = new Map<string, ProcedureRevenue>();
    for (const appointment of inRange) {
      if (appointment.status !== "completed") continue;
      const current = revenueMap.get(appointment.procedure) ?? {
        procedure: appointment.procedure,
        count: 0,
        totalCents: 0,
      };
      revenueMap.set(appointment.procedure, {
        procedure: appointment.procedure,
        count: current.count + 1,
        totalCents: current.totalCents + appointment.price.cents,
      });
    }
    const revenueByProcedure = [...revenueMap.values()].sort(
      (a, b) => b.totalCents - a.totalCents,
    );

    return { byStatus, revenueByProcedure };
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

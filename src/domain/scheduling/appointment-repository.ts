import type { Appointment } from "./appointment";
import type { TimeSlot } from "../shared/time-slot";

export interface AppointmentRepository {
  save(appointment: Appointment): Promise<void>;
  findById(id: string): Promise<Appointment | null>;
  findByPatientId(patientId: string): Promise<Appointment[]>;
  findInRange(start: Date, end: Date): Promise<Appointment[]>;
  findConflicting(slot: TimeSlot, excludeId?: string): Promise<Appointment[]>;
}

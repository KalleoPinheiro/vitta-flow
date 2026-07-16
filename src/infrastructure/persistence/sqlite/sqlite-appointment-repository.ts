import type { Database } from "better-sqlite3";
import { Appointment, type AppointmentStatus } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import { Money } from "@/domain/shared/money";
import { TimeSlot } from "@/domain/shared/time-slot";

interface AppointmentRow {
  id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  procedure: string;
  price_cents: number;
  notes: string | null;
  status: string;
  created_at: string;
}

const toAppointment = (row: AppointmentRow): Appointment =>
  Appointment.restore({
    id: row.id,
    patientId: row.patient_id,
    slot: TimeSlot.create(new Date(row.starts_at), new Date(row.ends_at)),
    procedure: row.procedure,
    price: Money.fromCents(row.price_cents),
    notes: row.notes,
    status: row.status as AppointmentStatus,
    createdAt: new Date(row.created_at),
  });

export class SqliteAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: Database) {}

  async save(appointment: Appointment): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO appointments (id, patient_id, starts_at, ends_at, procedure, price_cents, notes, status, created_at)
         VALUES (@id, @patientId, @startsAt, @endsAt, @procedure, @priceCents, @notes, @status, @createdAt)
         ON CONFLICT(id) DO UPDATE SET
           patient_id = @patientId, starts_at = @startsAt, ends_at = @endsAt,
           procedure = @procedure, price_cents = @priceCents, notes = @notes, status = @status`,
      )
      .run({
        id: appointment.id,
        patientId: appointment.patientId,
        startsAt: appointment.slot.start.toISOString(),
        endsAt: appointment.slot.end.toISOString(),
        procedure: appointment.procedure,
        priceCents: appointment.price.cents,
        notes: appointment.notes,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
      });
  }

  async findById(id: string): Promise<Appointment | null> {
    const row = this.db
      .prepare<[string], AppointmentRow>("SELECT * FROM appointments WHERE id = ?")
      .get(id);
    return row ? toAppointment(row) : null;
  }

  async findByPatientId(patientId: string): Promise<Appointment[]> {
    return this.db
      .prepare<[string], AppointmentRow>(
        "SELECT * FROM appointments WHERE patient_id = ? ORDER BY starts_at",
      )
      .all(patientId)
      .map(toAppointment);
  }

  async findInRange(start: Date, end: Date): Promise<Appointment[]> {
    return this.db
      .prepare<[string, string], AppointmentRow>(
        `SELECT * FROM appointments
         WHERE starts_at < ? AND ends_at > ?
         ORDER BY starts_at`,
      )
      .all(end.toISOString(), start.toISOString())
      .map(toAppointment);
  }

  async findConflicting(slot: TimeSlot, excludeId?: string): Promise<Appointment[]> {
    return this.db
      .prepare<[string, string, string], AppointmentRow>(
        `SELECT * FROM appointments
         WHERE status IN ('scheduled', 'confirmed')
           AND starts_at < ? AND ends_at > ?
           AND id != ?`,
      )
      .all(slot.end.toISOString(), slot.start.toISOString(), excludeId ?? "")
      .map(toAppointment);
  }
}

import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { Appointment, type AppointmentStatus } from "@/domain/scheduling/appointment";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import { Money } from "@/domain/shared/money";
import { TimeSlot } from "@/domain/shared/time-slot";
import type { AppDb } from "./db";
import { appointments } from "./schema";

type AppointmentRow = typeof appointments.$inferSelect;

const ACTIVE_STATUSES = ["scheduled", "confirmed"];

const toAppointment = (row: AppointmentRow): Appointment =>
  Appointment.restore({
    id: row.id,
    patientId: row.patientId,
    slot: TimeSlot.create(row.startsAt, row.endsAt),
    procedure: row.procedure,
    price: Money.fromCents(row.priceCents),
    notes: row.notes,
    status: row.status as AppointmentStatus,
    googleEventId: row.googleEventId,
    createdAt: row.createdAt,
  });

export class DrizzleAppointmentRepository implements AppointmentRepository {
  constructor(private readonly db: AppDb) {}

  async save(appointment: Appointment): Promise<void> {
    const values = {
      id: appointment.id,
      patientId: appointment.patientId,
      startsAt: appointment.slot.start,
      endsAt: appointment.slot.end,
      procedure: appointment.procedure,
      priceCents: appointment.price.cents,
      notes: appointment.notes,
      status: appointment.status,
      googleEventId: appointment.googleEventId,
      createdAt: appointment.createdAt,
    };
    await this.db
      .insert(appointments)
      .values(values)
      .onConflictDoUpdate({ target: appointments.id, set: values });
  }

  async findById(id: string): Promise<Appointment | null> {
    const rows = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return rows[0] ? toAppointment(rows[0]) : null;
  }

  async findByPatientId(patientId: string): Promise<Appointment[]> {
    const rows = await this.db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(asc(appointments.startsAt));
    return rows.map(toAppointment);
  }

  async findInRange(start: Date, end: Date): Promise<Appointment[]> {
    const rows = await this.db
      .select()
      .from(appointments)
      .where(and(lt(appointments.startsAt, end), gt(appointments.endsAt, start)))
      .orderBy(asc(appointments.startsAt));
    return rows.map(toAppointment);
  }

  async findConflicting(slot: TimeSlot, excludeId?: string): Promise<Appointment[]> {
    const conditions = [
      inArray(appointments.status, ACTIVE_STATUSES),
      lt(appointments.startsAt, slot.end),
      gt(appointments.endsAt, slot.start),
    ];
    if (excludeId) {
      conditions.push(ne(appointments.id, excludeId));
    }
    const rows = await this.db
      .select()
      .from(appointments)
      .where(and(...conditions));
    return rows.map(toAppointment);
  }
}

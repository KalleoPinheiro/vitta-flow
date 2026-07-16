import { eq, ilike, or } from "drizzle-orm";
import { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { AppDb } from "./db";
import { patients } from "./schema";

type PatientRow = typeof patients.$inferSelect;

const toPatient = (row: PatientRow): Patient =>
  Patient.restore({
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    birthDate: row.birthDate,
    notes: row.notes,
    active: row.active,
    createdAt: row.createdAt,
  });

export class DrizzlePatientRepository implements PatientRepository {
  constructor(private readonly db: AppDb) {}

  async save(patient: Patient): Promise<void> {
    const values = {
      id: patient.id,
      fullName: patient.fullName,
      email: patient.email,
      phone: patient.phone,
      birthDate: patient.birthDate,
      notes: patient.notes,
      active: patient.isActive,
      createdAt: patient.createdAt,
    };
    await this.db
      .insert(patients)
      .values(values)
      .onConflictDoUpdate({ target: patients.id, set: values });
  }

  async findById(id: string): Promise<Patient | null> {
    const rows = await this.db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return rows[0] ? toPatient(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Patient | null> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] ? toPatient(rows[0]) : null;
  }

  async findAll(search?: string): Promise<Patient[]> {
    const query = this.db.select().from(patients);
    const rows = search
      ? await query.where(
          or(
            ilike(patients.fullName, `%${search}%`),
            ilike(patients.email, `%${search}%`),
            ilike(patients.phone, `%${search}%`),
          ),
        )
      : await query;
    return rows
      .map(toPatient)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}

import { asc, eq, ilike, inArray, or } from "drizzle-orm";
import { Patient } from "@/domain/patient/patient";
import type { PatientPage, PatientRepository } from "@/domain/patient/patient-repository";
import { MAX_ROWS, type AppDb } from "./db";
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
    referredByPartnerId: row.referredByPartnerId,
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
      referredByPartnerId: patient.referredByPartnerId,
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

  async findByIds(ids: string[]): Promise<Patient[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db.select().from(patients).where(inArray(patients.id, unique));
    return rows.map(toPatient);
  }

  async findByReferrer(partnerId: string): Promise<Patient[]> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(eq(patients.referredByPartnerId, partnerId))
      .limit(MAX_ROWS);
    return rows.map(toPatient);
  }

  async findAll(search?: string, page: PatientPage = {}): Promise<Patient[]> {
    const limit = Math.min(page.limit ?? MAX_ROWS, MAX_ROWS);
    const where = search
      ? or(
          ilike(patients.fullName, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.phone, `%${search}%`),
        )
      : undefined;
    const rows = await this.db
      .select()
      .from(patients)
      .where(where)
      .orderBy(asc(patients.fullName), asc(patients.id))
      .limit(limit)
      .offset(page.offset ?? 0);
    return rows.map(toPatient);
  }
}

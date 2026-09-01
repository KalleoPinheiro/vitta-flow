import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { Patient } from "@/domain/patient/patient";
import type { PatientPage, PatientRepository } from "@/domain/patient/patient-repository";
import { MAX_ROWS, type AppDb } from "./db";
import { patients } from "./schema";
import { withTenant } from "./tenant-scope";

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
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async save(patient: Patient): Promise<void> {
    if (this.clinicId === null) {
      throw new Error("Papel de sistema não pode salvar paciente (somente leitura cross-empresa)");
    }
    const values = {
      id: patient.id,
      clinicId: this.clinicId,
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
    const rows = await this.db
      .select()
      .from(patients)
      .where(withTenant(patients, this.clinicId, eq(patients.id, id)))
      .limit(1);
    return rows[0] ? toPatient(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Patient | null> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(withTenant(patients, this.clinicId, eq(patients.email, email.trim().toLowerCase())))
      .limit(1);
    return rows[0] ? toPatient(rows[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Patient[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(patients)
      .where(withTenant(patients, this.clinicId, inArray(patients.id, unique)));
    return rows.map(toPatient);
  }

  async findClinicIdById(id: string): Promise<string | null> {
    const rows = await this.db
      .select({ clinicId: patients.clinicId })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);
    return rows[0]?.clinicId ?? null;
  }

  async countByEmail(email: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(eq(patients.email, email.trim().toLowerCase()));
    return rows[0]?.count ?? 0;
  }

  async findByReferrer(partnerId: string): Promise<Patient[]> {
    const rows = await this.db
      .select()
      .from(patients)
      .where(withTenant(patients, this.clinicId, eq(patients.referredByPartnerId, partnerId)))
      .limit(MAX_ROWS);
    return rows.map(toPatient);
  }

  async findAll(search?: string, page: PatientPage = {}): Promise<Patient[]> {
    if (page.ids && page.ids.length === 0) {
      return [];
    }
    const limit = Math.min(page.limit ?? MAX_ROWS, MAX_ROWS);
    const searchFilter = search
      ? or(
          ilike(patients.fullName, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.phone, `%${search}%`),
        )
      : undefined;
    const idsFilter = page.ids ? inArray(patients.id, page.ids) : undefined;
    const filter =
      searchFilter && idsFilter ? and(searchFilter, idsFilter) : (searchFilter ?? idsFilter);
    const rows = await this.db
      .select()
      .from(patients)
      .where(withTenant(patients, this.clinicId, filter))
      .orderBy(asc(patients.fullName), asc(patients.id))
      .limit(limit)
      .offset(page.offset ?? 0);
    return rows.map(toPatient);
  }
}

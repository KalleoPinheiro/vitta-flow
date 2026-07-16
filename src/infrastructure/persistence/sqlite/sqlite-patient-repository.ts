import type { Database } from "better-sqlite3";
import { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";

interface PatientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  birth_date: string | null;
  notes: string | null;
  active: number;
  created_at: string;
}

const toPatient = (row: PatientRow): Patient =>
  Patient.restore({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date ? new Date(row.birth_date) : null,
    notes: row.notes,
    active: row.active === 1,
    createdAt: new Date(row.created_at),
  });

export class SqlitePatientRepository implements PatientRepository {
  constructor(private readonly db: Database) {}

  async save(patient: Patient): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO patients (id, full_name, email, phone, birth_date, notes, active, created_at)
         VALUES (@id, @fullName, @email, @phone, @birthDate, @notes, @active, @createdAt)
         ON CONFLICT(id) DO UPDATE SET
           full_name = @fullName, email = @email, phone = @phone,
           birth_date = @birthDate, notes = @notes, active = @active`,
      )
      .run({
        id: patient.id,
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        birthDate: patient.birthDate?.toISOString() ?? null,
        notes: patient.notes,
        active: patient.isActive ? 1 : 0,
        createdAt: patient.createdAt.toISOString(),
      });
  }

  async findById(id: string): Promise<Patient | null> {
    const row = this.db.prepare<[string], PatientRow>("SELECT * FROM patients WHERE id = ?").get(id);
    return row ? toPatient(row) : null;
  }

  async findByEmail(email: string): Promise<Patient | null> {
    const row = this.db
      .prepare<[string], PatientRow>("SELECT * FROM patients WHERE email = ?")
      .get(email.trim().toLowerCase());
    return row ? toPatient(row) : null;
  }

  async findAll(search?: string): Promise<Patient[]> {
    const rows = search
      ? this.db
          .prepare<[string, string, string], PatientRow>(
            `SELECT * FROM patients
             WHERE lower(full_name) LIKE ? OR lower(email) LIKE ? OR phone LIKE ?
             ORDER BY full_name`,
          )
          .all(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search}%`)
      : this.db.prepare<[], PatientRow>("SELECT * FROM patients ORDER BY full_name").all();
    return rows.map(toPatient);
  }
}

import type { Patient } from "./patient";

export interface PatientRepository {
  save(patient: Patient): Promise<void>;
  findById(id: string): Promise<Patient | null>;
  findByEmail(email: string): Promise<Patient | null>;
  findByIds(ids: string[]): Promise<Patient[]>;
  findAll(search?: string): Promise<Patient[]>;
}

import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";

export class InMemoryPatientRepository implements PatientRepository {
  private readonly patients = new Map<string, Patient>();

  async save(patient: Patient): Promise<void> {
    this.patients.set(patient.id, patient);
  }

  async findById(id: string): Promise<Patient | null> {
    return this.patients.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Patient | null> {
    const normalized = email.trim().toLowerCase();
    return [...this.patients.values()].find((p) => p.email === normalized) ?? null;
  }

  async findAll(search?: string): Promise<Patient[]> {
    const all = [...this.patients.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
    if (!search) {
      return all;
    }
    const term = search.toLowerCase();
    return all.filter(
      (p) =>
        p.fullName.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.phone.includes(term),
    );
  }
}

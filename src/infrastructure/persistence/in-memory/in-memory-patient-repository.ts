import type { Patient } from "@/domain/patient/patient";
import type { PatientPage, PatientRepository } from "@/domain/patient/patient-repository";

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

  /** Repositório in-memory não é tenant-aware — usado só em testes de camada de aplicação. */
  async findClinicIdById(): Promise<string | null> {
    return null;
  }

  async findByReferrer(partnerId: string): Promise<Patient[]> {
    return [...this.patients.values()].filter((p) => p.referredByPartnerId === partnerId);
  }

  async findByIds(ids: string[]): Promise<Patient[]> {
    const unique = [...new Set(ids)];
    return unique.flatMap((id) => {
      const patient = this.patients.get(id);
      return patient ? [patient] : [];
    });
  }

  async findAll(search?: string, page: PatientPage = {}): Promise<Patient[]> {
    const all = [...this.patients.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
    const term = search?.toLowerCase();
    const filtered = term
      ? all.filter(
          (p) =>
            p.fullName.toLowerCase().includes(term) ||
            p.email.toLowerCase().includes(term) ||
            p.phone.includes(term),
        )
      : all;
    const offset = page.offset ?? 0;
    return page.limit != null
      ? filtered.slice(offset, offset + page.limit)
      : filtered.slice(offset);
  }
}

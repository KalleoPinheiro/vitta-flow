import { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { ValidationError } from "@/domain/shared/errors";

export interface CreatePatientInput {
  fullName: string;
  email: string;
  phone: string;
  birthDate?: Date | null;
  notes?: string | null;
  referredByPartnerId?: string | null;
}

export class CreatePatient {
  constructor(private readonly patients: PatientRepository) {}

  async execute(input: CreatePatientInput): Promise<Patient> {
    const existing = await this.patients.findByEmail(input.email);
    if (existing) {
      throw new ValidationError(`Já existe paciente com o email ${input.email}`);
    }
    const patient = Patient.create(input);
    await this.patients.save(patient);
    return patient;
  }
}

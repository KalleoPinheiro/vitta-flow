import { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import { ValidationError } from "@/domain/shared/errors";
import { assertValidReferrer } from "./assert-valid-referrer";

export interface CreatePatientInput {
  fullName: string;
  email: string;
  phone: string;
  birthDate?: Date | null;
  notes?: string | null;
  referredByPartnerId?: string | null;
}

export class CreatePatient {
  constructor(
    private readonly patients: PatientRepository,
    private readonly partners?: PartnerRepository,
  ) {}

  async execute(input: CreatePatientInput): Promise<Patient> {
    const existing = await this.patients.findByEmail(input.email);
    if (existing) {
      throw new ValidationError(`Já existe paciente com o email ${input.email}`);
    }
    await assertValidReferrer(this.partners, input.referredByPartnerId);
    const patient = Patient.create(input);
    await this.patients.save(patient);
    return patient;
  }
}

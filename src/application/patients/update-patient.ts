import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";
import { assertValidReferrer } from "./create-patient";

export interface UpdatePatientInput {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  birthDate?: Date | null;
  notes?: string | null;
  referredByPartnerId?: string | null;
}

export class UpdatePatient {
  constructor(
    private readonly patients: PatientRepository,
    private readonly partners?: PartnerRepository,
  ) {}

  async execute(input: UpdatePatientInput): Promise<Patient> {
    const patient = await this.patients.findById(input.id);
    if (!patient) {
      throw new NotFoundError("Paciente", input.id);
    }
    if (input.email) {
      const byEmail = await this.patients.findByEmail(input.email);
      if (byEmail && byEmail.id !== patient.id) {
        throw new ValidationError(`Já existe paciente com o email ${input.email}`);
      }
    }
    await assertValidReferrer(this.partners, input.referredByPartnerId);
    const updated = patient.update(input);
    await this.patients.save(updated);
    return updated;
  }
}

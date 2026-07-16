import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { NotFoundError } from "@/domain/shared/errors";

export class GetPatient {
  constructor(private readonly patients: PatientRepository) {}

  async execute(input: { id: string }): Promise<Patient> {
    const patient = await this.patients.findById(input.id);
    if (!patient) {
      throw new NotFoundError("Paciente", input.id);
    }
    return patient;
  }
}

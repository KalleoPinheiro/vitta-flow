import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";

export interface ListPatientsInput {
  search?: string;
}

export class ListPatients {
  constructor(private readonly patients: PatientRepository) {}

  async execute(input: ListPatientsInput = {}): Promise<Patient[]> {
    return this.patients.findAll(input.search);
  }
}

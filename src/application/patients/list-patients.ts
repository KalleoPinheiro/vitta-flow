import type { Patient } from "@/domain/patient/patient";
import type { PatientRepository } from "@/domain/patient/patient-repository";

export interface ListPatientsInput {
  search?: string;
  limit?: number;
  offset?: number;
  /** Escopo dinâmico do Profissional (R4): restringe a lista a estes IDs. */
  allowedPatientIds?: string[];
}

export class ListPatients {
  constructor(private readonly patients: PatientRepository) {}

  async execute(input: ListPatientsInput = {}): Promise<Patient[]> {
    return this.patients.findAll(input.search, {
      limit: input.limit,
      offset: input.offset,
      ids: input.allowedPatientIds,
    });
  }
}

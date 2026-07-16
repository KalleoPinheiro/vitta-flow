import {
  ClinicalCondition,
  type ConditionKind,
  type StomaType,
} from "@/domain/clinical/clinical-condition";
import type { ClinicalConditionRepository } from "@/domain/clinical/clinical-repositories";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { NotFoundError } from "@/domain/shared/errors";

export interface CreateConditionInput {
  patientId: string;
  kind: ConditionKind;
  title: string;
  stomaType?: StomaType | null;
  startedAt?: Date | null;
  notes?: string | null;
}

export class CreateCondition {
  constructor(
    private readonly conditions: ClinicalConditionRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: CreateConditionInput): Promise<ClinicalCondition> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError("Paciente", input.patientId);
    }
    const condition = ClinicalCondition.create(input);
    await this.conditions.save(condition);
    return condition;
  }
}

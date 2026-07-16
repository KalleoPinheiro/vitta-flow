import type { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import type { ClinicalConditionRepository } from "@/domain/clinical/clinical-repositories";

export class ListConditions {
  constructor(private readonly conditions: ClinicalConditionRepository) {}

  async execute(input: { patientId: string }): Promise<ClinicalCondition[]> {
    return this.conditions.findByPatientId(input.patientId);
  }
}

import type { NursingDiagnosis } from "@/domain/taxonomy/nursing-diagnosis";
import type { NursingDiagnosisRepository } from "@/domain/taxonomy/taxonomy-repositories";

export class SearchDiagnoses {
  constructor(private readonly diagnoses: NursingDiagnosisRepository) {}

  async execute(input: { term: string; limit?: number }): Promise<NursingDiagnosis[]> {
    return this.diagnoses.search(input.term, { limit: input.limit });
  }
}

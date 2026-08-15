import type { NursingIntervention } from "@/domain/taxonomy/nursing-intervention";
import type { NursingInterventionRepository } from "@/domain/taxonomy/taxonomy-repositories";

export class SearchInterventions {
  constructor(private readonly interventions: NursingInterventionRepository) {}

  async execute(input: { term: string; limit?: number }): Promise<NursingIntervention[]> {
    return this.interventions.search(input.term, { limit: input.limit });
  }
}

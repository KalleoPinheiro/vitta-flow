import type { NursingOutcome } from "@/domain/taxonomy/nursing-outcome";
import type { NursingOutcomeRepository } from "@/domain/taxonomy/taxonomy-repositories";

export class SearchOutcomes {
  constructor(private readonly outcomes: NursingOutcomeRepository) {}

  async execute(input: { term: string; limit?: number }): Promise<NursingOutcome[]> {
    return this.outcomes.search(input.term, { limit: input.limit });
  }
}

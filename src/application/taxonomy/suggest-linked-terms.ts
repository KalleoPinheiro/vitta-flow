import type { NursingIntervention } from '@/domain/taxonomy/nursing-intervention';
import type { NursingOutcome } from '@/domain/taxonomy/nursing-outcome';
import type {
  NursingInterventionRepository,
  NursingOutcomeRepository,
  TaxonomyLinkageRepository,
} from '@/domain/taxonomy/taxonomy-repositories';

export interface LinkedTerms {
  outcomes: NursingOutcome[];
  interventions: NursingIntervention[];
}

/** Resultados e intervenções ligados ao diagnóstico — priorizam a prescrição, não a restringem. */
export class SuggestLinkedTerms {
  constructor(
    private readonly linkages: TaxonomyLinkageRepository,
    private readonly outcomes: NursingOutcomeRepository,
    private readonly interventions: NursingInterventionRepository,
  ) {}

  async execute(input: { diagnosisCode: string }): Promise<LinkedTerms> {
    const links = await this.linkages.findByDiagnosisCode(input.diagnosisCode);
    const outcomeCodes = links
      .filter((link) => link.role === 'outcome')
      .map((link) => link.targetCode);
    const interventionCodes = links
      .filter((link) => link.role === 'intervention')
      .map((link) => link.targetCode);

    const [outcomes, interventions] = await Promise.all([
      this.outcomes.findByCodes(outcomeCodes),
      this.interventions.findByCodes(interventionCodes),
    ]);
    return { outcomes, interventions };
  }
}

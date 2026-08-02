import { OutcomeEvaluation } from "@/domain/clinical/outcome-evaluation";
import type {
  CarePlanOutcomeRepository,
  OutcomeEvaluationRepository,
} from "@/domain/clinical/clinical-repositories";
import { NotFoundError } from "@/domain/shared/errors";

export interface EvaluateOutcomeInput {
  outcomeId: string;
  score: number;
  professionalId?: string | null;
  notes?: string | null;
}

export class EvaluateOutcome {
  constructor(
    private readonly evaluations: OutcomeEvaluationRepository,
    private readonly outcomes: CarePlanOutcomeRepository,
  ) {}

  async execute(input: EvaluateOutcomeInput): Promise<OutcomeEvaluation> {
    const outcome = await this.outcomes.findById(input.outcomeId);
    if (!outcome) {
      throw new NotFoundError("Resultado prescrito", input.outcomeId);
    }
    const evaluation = OutcomeEvaluation.create(input);
    await this.evaluations.save(evaluation);
    return evaluation;
  }
}

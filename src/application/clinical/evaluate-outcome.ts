import { OutcomeEvaluation } from "@/domain/clinical/outcome-evaluation";
import type {
  CarePlanOutcomeRepository,
  CarePlanRepository,
  OutcomeEvaluationRepository,
} from "@/domain/clinical/clinical-repositories";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

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
    private readonly carePlans: CarePlanRepository,
  ) {}

  async execute(input: EvaluateOutcomeInput): Promise<OutcomeEvaluation> {
    const outcome = await this.outcomes.findById(input.outcomeId);
    if (!outcome) {
      throw new NotFoundError("Resultado prescrito", input.outcomeId);
    }
    const plan = await this.carePlans.findById(outcome.carePlanId);
    if (!plan?.isActive) {
      throw new ValidationError("Plano de cuidados não está ativo");
    }
    const evaluation = OutcomeEvaluation.create(input);
    await this.evaluations.save(evaluation);
    return evaluation;
  }
}

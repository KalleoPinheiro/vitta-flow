import { CarePlanOutcome } from '@/domain/clinical/care-plan-outcome';
import type {
  CarePlanOutcomeRepository,
  CarePlanRepository,
} from '@/domain/clinical/clinical-repositories';
import { NotFoundError, ValidationError } from '@/domain/shared/errors';
import type { NursingOutcomeRepository } from '@/domain/taxonomy/taxonomy-repositories';

export interface PrescribeOutcomeInput {
  carePlanId: string;
  outcomeCode: string;
  baselineScore: number;
  targetScore: number;
  deadline?: Date | null;
}

export class PrescribeOutcome {
  constructor(
    private readonly outcomes: CarePlanOutcomeRepository,
    private readonly carePlans: CarePlanRepository,
    private readonly catalog: NursingOutcomeRepository,
  ) {}

  async execute(input: PrescribeOutcomeInput): Promise<CarePlanOutcome> {
    const plan = await this.carePlans.findById(input.carePlanId);
    if (!plan) {
      throw new NotFoundError('Plano de cuidados', input.carePlanId);
    }
    if (!plan.isActive) {
      throw new ValidationError('Plano de cuidados não está ativo');
    }
    const catalogEntry = await this.catalog.findByCode(input.outcomeCode);
    if (!catalogEntry) {
      throw new NotFoundError('Resultado NOC', input.outcomeCode);
    }
    const outcome = CarePlanOutcome.create(input);
    await this.outcomes.save(outcome);
    return outcome;
  }
}

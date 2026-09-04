import {
  CarePlanIntervention,
  type InterventionPriority,
} from '@/domain/clinical/care-plan-intervention';
import type {
  CarePlanInterventionRepository,
  CarePlanRepository,
} from '@/domain/clinical/clinical-repositories';
import { NotFoundError, ValidationError } from '@/domain/shared/errors';
import type { NursingInterventionRepository } from '@/domain/taxonomy/taxonomy-repositories';

export interface PrescribeInterventionInput {
  carePlanId: string;
  interventionCode: string;
  frequency: string;
  priority: InterventionPriority;
}

export class PrescribeIntervention {
  constructor(
    private readonly interventions: CarePlanInterventionRepository,
    private readonly carePlans: CarePlanRepository,
    private readonly catalog: NursingInterventionRepository,
  ) {}

  async execute(
    input: PrescribeInterventionInput,
  ): Promise<CarePlanIntervention> {
    const plan = await this.carePlans.findById(input.carePlanId);
    if (!plan) {
      throw new NotFoundError('Plano de cuidados', input.carePlanId);
    }
    if (!plan.isActive) {
      throw new ValidationError('Plano de cuidados não está ativo');
    }
    const catalogEntry = await this.catalog.findByCode(input.interventionCode);
    if (!catalogEntry) {
      throw new NotFoundError('Intervenção NIC', input.interventionCode);
    }
    const intervention = CarePlanIntervention.create(input);
    await this.interventions.save(intervention);
    return intervention;
  }
}

import type { CarePlan } from '@/domain/clinical/care-plan';
import type { CarePlanRepository } from '@/domain/clinical/clinical-repositories';
import { NotFoundError } from '@/domain/shared/errors';

export class ResolveCarePlan {
  constructor(private readonly carePlans: CarePlanRepository) {}

  async execute(input: { id: string }): Promise<CarePlan> {
    const plan = await this.carePlans.findById(input.id);
    if (!plan) {
      throw new NotFoundError('Plano de cuidados', input.id);
    }
    const resolved = plan.resolve();
    await this.carePlans.save(resolved);
    return resolved;
  }
}

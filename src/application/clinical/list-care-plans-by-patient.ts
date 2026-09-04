import type { CarePlan } from '@/domain/clinical/care-plan';
import type { CarePlanRepository } from '@/domain/clinical/clinical-repositories';

export class ListCarePlansByPatient {
  constructor(private readonly carePlans: CarePlanRepository) {}

  async execute(input: { patientId: string }): Promise<CarePlan[]> {
    return this.carePlans.findByPatientId(input.patientId);
  }
}

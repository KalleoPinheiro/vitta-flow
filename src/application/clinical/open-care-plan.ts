import { CarePlan } from "@/domain/clinical/care-plan";
import type { CarePlanRepository } from "@/domain/clinical/clinical-repositories";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { NotFoundError } from "@/domain/shared/errors";

export interface OpenCarePlanInput {
  patientId: string;
  conditionId?: string | null;
  professionalId?: string | null;
}

export class OpenCarePlan {
  constructor(
    private readonly carePlans: CarePlanRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: OpenCarePlanInput): Promise<CarePlan> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError("Paciente", input.patientId);
    }
    const plan = CarePlan.create(input);
    await this.carePlans.save(plan);
    return plan;
  }
}

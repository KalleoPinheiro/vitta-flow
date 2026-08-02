import { CarePlan } from "@/domain/clinical/care-plan";
import type {
  CarePlanRepository,
  ClinicalConditionRepository,
} from "@/domain/clinical/clinical-repositories";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

export interface OpenCarePlanInput {
  patientId: string;
  conditionId?: string | null;
  professionalId?: string | null;
}

export class OpenCarePlan {
  constructor(
    private readonly carePlans: CarePlanRepository,
    private readonly patients: PatientRepository,
    private readonly conditions: ClinicalConditionRepository,
  ) {}

  async execute(input: OpenCarePlanInput): Promise<CarePlan> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError("Paciente", input.patientId);
    }
    if (input.conditionId) {
      const condition = await this.conditions.findById(input.conditionId);
      if (!condition) {
        throw new NotFoundError("Condição clínica", input.conditionId);
      }
      if (condition.patientId !== input.patientId) {
        throw new ValidationError("Condição não pertence ao paciente informado");
      }
    }
    const plan = CarePlan.create(input);
    await this.carePlans.save(plan);
    return plan;
  }
}

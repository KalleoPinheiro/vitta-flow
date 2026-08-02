import { CarePlanDiagnosis, type CarePlanDiagnosisType } from "@/domain/clinical/care-plan-diagnosis";
import type { CarePlanDiagnosisRepository, CarePlanRepository } from "@/domain/clinical/clinical-repositories";
import type { NursingDiagnosisRepository } from "@/domain/taxonomy/taxonomy-repositories";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

export interface AddCarePlanDiagnosisInput {
  carePlanId: string;
  diagnosisCode: string;
  type: CarePlanDiagnosisType;
  relatedFactors?: string | null;
  definingCharacteristics?: string | null;
}

export class AddCarePlanDiagnosis {
  constructor(
    private readonly diagnoses: CarePlanDiagnosisRepository,
    private readonly carePlans: CarePlanRepository,
    private readonly catalog: NursingDiagnosisRepository,
  ) {}

  async execute(input: AddCarePlanDiagnosisInput): Promise<CarePlanDiagnosis> {
    const plan = await this.carePlans.findById(input.carePlanId);
    if (!plan) {
      throw new NotFoundError("Plano de cuidados", input.carePlanId);
    }
    if (!plan.isActive) {
      throw new ValidationError("Plano de cuidados não está ativo");
    }
    const catalogEntry = await this.catalog.findByCode(input.diagnosisCode);
    if (!catalogEntry) {
      throw new NotFoundError("Diagnóstico NANDA-I", input.diagnosisCode);
    }
    const diagnosis = CarePlanDiagnosis.create(input);
    await this.diagnoses.save(diagnosis);
    return diagnosis;
  }
}

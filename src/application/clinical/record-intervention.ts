import { InterventionRecord } from "@/domain/clinical/intervention-record";
import type {
  CarePlanInterventionRepository,
  CarePlanRepository,
  InterventionRecordRepository,
} from "@/domain/clinical/clinical-repositories";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

export interface RecordInterventionInput {
  interventionId: string;
  professionalId?: string | null;
  notes?: string | null;
}

export class RecordIntervention {
  constructor(
    private readonly records: InterventionRecordRepository,
    private readonly interventions: CarePlanInterventionRepository,
    private readonly carePlans: CarePlanRepository,
  ) {}

  async execute(input: RecordInterventionInput): Promise<InterventionRecord> {
    const intervention = await this.interventions.findById(input.interventionId);
    if (!intervention) {
      throw new NotFoundError("Intervenção prescrita", input.interventionId);
    }
    const plan = await this.carePlans.findById(intervention.carePlanId);
    if (!plan?.isActive) {
      throw new ValidationError("Plano de cuidados não está ativo");
    }
    const record = InterventionRecord.create(input);
    await this.records.save(record);
    return record;
  }
}

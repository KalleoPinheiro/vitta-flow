import type { CarePlan } from "@/domain/clinical/care-plan";
import type { CarePlanDiagnosis } from "@/domain/clinical/care-plan-diagnosis";
import type { CarePlanOutcome } from "@/domain/clinical/care-plan-outcome";
import type { CarePlanIntervention } from "@/domain/clinical/care-plan-intervention";
import type { OutcomeEvaluation } from "@/domain/clinical/outcome-evaluation";
import type { InterventionRecord } from "@/domain/clinical/intervention-record";
import type {
  CarePlanDiagnosisRepository,
  CarePlanInterventionRepository,
  CarePlanOutcomeRepository,
  CarePlanRepository,
  InterventionRecordRepository,
  OutcomeEvaluationRepository,
} from "@/domain/clinical/clinical-repositories";
import { NotFoundError } from "@/domain/shared/errors";

export interface CarePlanOutcomeDetail {
  outcome: CarePlanOutcome;
  evaluations: OutcomeEvaluation[];
}

export interface CarePlanInterventionDetail {
  intervention: CarePlanIntervention;
  records: InterventionRecord[];
}

export interface CarePlanDetail {
  plan: CarePlan;
  diagnoses: CarePlanDiagnosis[];
  outcomes: CarePlanOutcomeDetail[];
  interventions: CarePlanInterventionDetail[];
}

/** Monta a visão completa do plano — diagnósticos, resultados com histórico de avaliação
 * e intervenções com histórico de execução — em três buscas paralelas (evita N+1). */
export class GetCarePlan {
  constructor(
    private readonly carePlans: CarePlanRepository,
    private readonly diagnoses: CarePlanDiagnosisRepository,
    private readonly outcomes: CarePlanOutcomeRepository,
    private readonly interventions: CarePlanInterventionRepository,
    private readonly evaluations: OutcomeEvaluationRepository,
    private readonly records: InterventionRecordRepository,
  ) {}

  async execute(input: { id: string }): Promise<CarePlanDetail> {
    const plan = await this.carePlans.findById(input.id);
    if (!plan) {
      throw new NotFoundError("Plano de cuidados", input.id);
    }

    const [diagnosisList, outcomeList, interventionList] = await Promise.all([
      this.diagnoses.findByCarePlanId(plan.id),
      this.outcomes.findByCarePlanId(plan.id),
      this.interventions.findByCarePlanId(plan.id),
    ]);

    const [evaluationList, recordList] = await Promise.all([
      this.evaluations.findByOutcomeIds(outcomeList.map((outcome) => outcome.id)),
      this.records.findByInterventionIds(interventionList.map((intervention) => intervention.id)),
    ]);

    return {
      plan,
      diagnoses: diagnosisList,
      outcomes: outcomeList.map((outcome) => ({
        outcome,
        evaluations: evaluationList.filter((evaluation) => evaluation.outcomeId === outcome.id),
      })),
      interventions: interventionList.map((intervention) => ({
        intervention,
        records: recordList.filter((record) => record.interventionId === intervention.id),
      })),
    };
  }
}

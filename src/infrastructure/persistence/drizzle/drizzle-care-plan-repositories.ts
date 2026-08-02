import { asc, desc, eq, inArray } from "drizzle-orm";
import { CarePlan, type CarePlanStatus } from "@/domain/clinical/care-plan";
import {
  CarePlanDiagnosis,
  type CarePlanDiagnosisType,
} from "@/domain/clinical/care-plan-diagnosis";
import { CarePlanOutcome } from "@/domain/clinical/care-plan-outcome";
import {
  CarePlanIntervention,
  type InterventionPriority,
} from "@/domain/clinical/care-plan-intervention";
import { OutcomeEvaluation } from "@/domain/clinical/outcome-evaluation";
import { InterventionRecord } from "@/domain/clinical/intervention-record";
import type {
  CarePlanDiagnosisRepository,
  CarePlanInterventionRepository,
  CarePlanOutcomeRepository,
  CarePlanRepository,
  InterventionRecordRepository,
  OutcomeEvaluationRepository,
} from "@/domain/clinical/clinical-repositories";
import type { AppDb } from "./db";
import {
  carePlanDiagnoses,
  carePlanInterventions,
  carePlanOutcomes,
  carePlans,
  interventionRecords,
  outcomeEvaluations,
} from "./schema";

export class DrizzleCarePlanRepository implements CarePlanRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof carePlans.$inferSelect): CarePlan {
    return CarePlan.restore({ ...row, status: row.status as CarePlanStatus });
  }

  async save(carePlan: CarePlan): Promise<void> {
    const values = {
      id: carePlan.id,
      patientId: carePlan.patientId,
      conditionId: carePlan.conditionId,
      professionalId: carePlan.professionalId,
      status: carePlan.status,
      createdAt: carePlan.createdAt,
    };
    await this.db
      .insert(carePlans)
      .values(values)
      .onConflictDoUpdate({ target: carePlans.id, set: values });
  }

  async findById(id: string): Promise<CarePlan | null> {
    const rows = await this.db.select().from(carePlans).where(eq(carePlans.id, id)).limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByPatientId(patientId: string): Promise<CarePlan[]> {
    const rows = await this.db
      .select()
      .from(carePlans)
      .where(eq(carePlans.patientId, patientId))
      .orderBy(desc(carePlans.createdAt), asc(carePlans.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByConditionId(conditionId: string): Promise<CarePlan[]> {
    const rows = await this.db
      .select()
      .from(carePlans)
      .where(eq(carePlans.conditionId, conditionId))
      .orderBy(desc(carePlans.createdAt), asc(carePlans.id));
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleCarePlanDiagnosisRepository implements CarePlanDiagnosisRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof carePlanDiagnoses.$inferSelect): CarePlanDiagnosis {
    return CarePlanDiagnosis.restore({ ...row, type: row.type as CarePlanDiagnosisType });
  }

  async save(diagnosis: CarePlanDiagnosis): Promise<void> {
    await this.db.insert(carePlanDiagnoses).values({
      id: diagnosis.id,
      carePlanId: diagnosis.carePlanId,
      diagnosisCode: diagnosis.diagnosisCode,
      type: diagnosis.type,
      relatedFactors: diagnosis.relatedFactors,
      definingCharacteristics: diagnosis.definingCharacteristics,
      createdAt: diagnosis.createdAt,
    });
  }

  async findByCarePlanId(carePlanId: string): Promise<CarePlanDiagnosis[]> {
    const rows = await this.db
      .select()
      .from(carePlanDiagnoses)
      .where(eq(carePlanDiagnoses.carePlanId, carePlanId))
      .orderBy(desc(carePlanDiagnoses.createdAt), asc(carePlanDiagnoses.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByCarePlanIds(carePlanIds: string[]): Promise<CarePlanDiagnosis[]> {
    const unique = [...new Set(carePlanIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(carePlanDiagnoses)
      .where(inArray(carePlanDiagnoses.carePlanId, unique))
      .orderBy(desc(carePlanDiagnoses.createdAt), asc(carePlanDiagnoses.id));
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleCarePlanOutcomeRepository implements CarePlanOutcomeRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof carePlanOutcomes.$inferSelect): CarePlanOutcome {
    return CarePlanOutcome.restore(row);
  }

  async save(outcome: CarePlanOutcome): Promise<void> {
    await this.db.insert(carePlanOutcomes).values({
      id: outcome.id,
      carePlanId: outcome.carePlanId,
      outcomeCode: outcome.outcomeCode,
      baselineScore: outcome.baselineScore,
      targetScore: outcome.targetScore,
      deadline: outcome.deadline,
      createdAt: outcome.createdAt,
    });
  }

  async findById(id: string): Promise<CarePlanOutcome | null> {
    const rows = await this.db
      .select()
      .from(carePlanOutcomes)
      .where(eq(carePlanOutcomes.id, id))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByCarePlanId(carePlanId: string): Promise<CarePlanOutcome[]> {
    const rows = await this.db
      .select()
      .from(carePlanOutcomes)
      .where(eq(carePlanOutcomes.carePlanId, carePlanId))
      .orderBy(desc(carePlanOutcomes.createdAt), asc(carePlanOutcomes.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByCarePlanIds(carePlanIds: string[]): Promise<CarePlanOutcome[]> {
    const unique = [...new Set(carePlanIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(carePlanOutcomes)
      .where(inArray(carePlanOutcomes.carePlanId, unique))
      .orderBy(desc(carePlanOutcomes.createdAt), asc(carePlanOutcomes.id));
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleCarePlanInterventionRepository implements CarePlanInterventionRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof carePlanInterventions.$inferSelect): CarePlanIntervention {
    return CarePlanIntervention.restore({ ...row, priority: row.priority as InterventionPriority });
  }

  async save(intervention: CarePlanIntervention): Promise<void> {
    await this.db.insert(carePlanInterventions).values({
      id: intervention.id,
      carePlanId: intervention.carePlanId,
      interventionCode: intervention.interventionCode,
      frequency: intervention.frequency,
      priority: intervention.priority,
      createdAt: intervention.createdAt,
    });
  }

  async findById(id: string): Promise<CarePlanIntervention | null> {
    const rows = await this.db
      .select()
      .from(carePlanInterventions)
      .where(eq(carePlanInterventions.id, id))
      .limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findByCarePlanId(carePlanId: string): Promise<CarePlanIntervention[]> {
    const rows = await this.db
      .select()
      .from(carePlanInterventions)
      .where(eq(carePlanInterventions.carePlanId, carePlanId))
      .orderBy(desc(carePlanInterventions.createdAt), asc(carePlanInterventions.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByCarePlanIds(carePlanIds: string[]): Promise<CarePlanIntervention[]> {
    const unique = [...new Set(carePlanIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(carePlanInterventions)
      .where(inArray(carePlanInterventions.carePlanId, unique))
      .orderBy(desc(carePlanInterventions.createdAt), asc(carePlanInterventions.id));
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleOutcomeEvaluationRepository implements OutcomeEvaluationRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof outcomeEvaluations.$inferSelect): OutcomeEvaluation {
    return OutcomeEvaluation.restore(row);
  }

  async save(evaluation: OutcomeEvaluation): Promise<void> {
    await this.db.insert(outcomeEvaluations).values({
      id: evaluation.id,
      outcomeId: evaluation.outcomeId,
      score: evaluation.score,
      professionalId: evaluation.professionalId,
      notes: evaluation.notes,
      evaluatedAt: evaluation.evaluatedAt,
    });
  }

  async findByOutcomeId(outcomeId: string): Promise<OutcomeEvaluation[]> {
    const rows = await this.db
      .select()
      .from(outcomeEvaluations)
      .where(eq(outcomeEvaluations.outcomeId, outcomeId))
      .orderBy(desc(outcomeEvaluations.evaluatedAt), asc(outcomeEvaluations.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByOutcomeIds(outcomeIds: string[]): Promise<OutcomeEvaluation[]> {
    const unique = [...new Set(outcomeIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(outcomeEvaluations)
      .where(inArray(outcomeEvaluations.outcomeId, unique))
      .orderBy(desc(outcomeEvaluations.evaluatedAt), asc(outcomeEvaluations.id));
    return rows.map((row) => this.toEntity(row));
  }
}

export class DrizzleInterventionRecordRepository implements InterventionRecordRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof interventionRecords.$inferSelect): InterventionRecord {
    return InterventionRecord.restore(row);
  }

  async save(record: InterventionRecord): Promise<void> {
    await this.db.insert(interventionRecords).values({
      id: record.id,
      interventionId: record.interventionId,
      professionalId: record.professionalId,
      notes: record.notes,
      performedAt: record.performedAt,
    });
  }

  async findByInterventionId(interventionId: string): Promise<InterventionRecord[]> {
    const rows = await this.db
      .select()
      .from(interventionRecords)
      .where(eq(interventionRecords.interventionId, interventionId))
      .orderBy(desc(interventionRecords.performedAt), asc(interventionRecords.id));
    return rows.map((row) => this.toEntity(row));
  }

  async findByInterventionIds(interventionIds: string[]): Promise<InterventionRecord[]> {
    const unique = [...new Set(interventionIds)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(interventionRecords)
      .where(inArray(interventionRecords.interventionId, unique))
      .orderBy(desc(interventionRecords.performedAt), asc(interventionRecords.id));
    return rows.map((row) => this.toEntity(row));
  }
}

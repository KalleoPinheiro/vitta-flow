import type { Anamnesis } from "./anamnesis";
import type { ConditionPhoto } from "./condition-photo";
import type { EvolutionNote } from "./evolution-note";
import type { ClinicalCondition } from "./clinical-condition";
import type { ConditionAssessment } from "./condition-assessment";

export interface AnamnesisRepository {
  save(anamnesis: Anamnesis): Promise<void>;
  findByPatientId(patientId: string): Promise<Anamnesis | null>;
}

export interface EvolutionNoteRepository {
  save(note: EvolutionNote): Promise<void>;
  findByPatientId(patientId: string): Promise<EvolutionNote[]>;
}

export interface ClinicalConditionRepository {
  save(condition: ClinicalCondition): Promise<void>;
  findById(id: string): Promise<ClinicalCondition | null>;
  findByPatientId(patientId: string): Promise<ClinicalCondition[]>;
  /** Busca em lote — evita N+1 ao montar dados de vários pacientes. */
  findByPatientIds(patientIds: string[]): Promise<ClinicalCondition[]>;
}

export interface ConditionPhotoRepository {
  save(photo: ConditionPhoto): Promise<void>;
  findById(id: string): Promise<ConditionPhoto | null>;
  findByConditionId(conditionId: string): Promise<ConditionPhoto[]>;
  findByConditionIds(conditionIds: string[]): Promise<ConditionPhoto[]>;
  /** Exclusão restrita a correção de upload — sempre auditada na camada de API. */
  delete(id: string): Promise<void>;
}

export interface ConditionAssessmentRepository {
  save(assessment: ConditionAssessment): Promise<void>;
  findByConditionId(conditionId: string): Promise<ConditionAssessment[]>;
  /** Busca em lote — evita N+1 ao montar dados de várias condições. */
  findByConditionIds(conditionIds: string[]): Promise<ConditionAssessment[]>;
}

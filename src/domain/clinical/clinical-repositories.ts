import type { Anamnesis } from "./anamnesis";
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
}

export interface ConditionAssessmentRepository {
  save(assessment: ConditionAssessment): Promise<void>;
  findByConditionId(conditionId: string): Promise<ConditionAssessment[]>;
}

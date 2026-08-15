import type { NursingDiagnosis } from "./nursing-diagnosis";
import type { NursingOutcome } from "./nursing-outcome";
import type { NursingIntervention } from "./nursing-intervention";
import type { LinkageRole, TaxonomyLinkage } from "./taxonomy-linkage";

export interface NursingDiagnosisRepository {
  save(diagnosis: NursingDiagnosis): Promise<void>;
  findByCode(code: string): Promise<NursingDiagnosis | null>;
  /** Busca em lote — evita N+1 ao montar diagnósticos de vários planos. */
  findByCodes(codes: string[]): Promise<NursingDiagnosis[]>;
  search(term: string, options?: { limit?: number }): Promise<NursingDiagnosis[]>;
}

export interface NursingOutcomeRepository {
  save(outcome: NursingOutcome): Promise<void>;
  findByCode(code: string): Promise<NursingOutcome | null>;
  findByCodes(codes: string[]): Promise<NursingOutcome[]>;
  search(term: string, options?: { limit?: number }): Promise<NursingOutcome[]>;
}

export interface NursingInterventionRepository {
  save(intervention: NursingIntervention): Promise<void>;
  findByCode(code: string): Promise<NursingIntervention | null>;
  findByCodes(codes: string[]): Promise<NursingIntervention[]>;
  search(term: string, options?: { limit?: number }): Promise<NursingIntervention[]>;
}

export interface TaxonomyLinkageRepository {
  save(linkage: TaxonomyLinkage): Promise<void>;
  findByDiagnosisCode(diagnosisCode: string, role?: LinkageRole): Promise<TaxonomyLinkage[]>;
}

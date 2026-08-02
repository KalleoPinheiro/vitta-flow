import { NursingDiagnosis, type NursingDiagnosisProps } from "@/domain/taxonomy/nursing-diagnosis";
import { NursingOutcome, type NursingOutcomeProps } from "@/domain/taxonomy/nursing-outcome";
import {
  NursingIntervention,
  type NursingInterventionProps,
} from "@/domain/taxonomy/nursing-intervention";
import { TaxonomyLinkage, type TaxonomyLinkageProps } from "@/domain/taxonomy/taxonomy-linkage";
import type {
  NursingDiagnosisRepository,
  NursingInterventionRepository,
  NursingOutcomeRepository,
  TaxonomyLinkageRepository,
} from "@/domain/taxonomy/taxonomy-repositories";

export interface TaxonomyCatalog {
  diagnoses: NursingDiagnosisProps[];
  outcomes: NursingOutcomeProps[];
  interventions: NursingInterventionProps[];
  linkages: TaxonomyLinkageProps[];
}

export interface ImportTaxonomyCatalogDeps {
  diagnoses: NursingDiagnosisRepository;
  outcomes: NursingOutcomeRepository;
  interventions: NursingInterventionRepository;
  linkages: TaxonomyLinkageRepository;
}

export interface ImportTaxonomyCatalogResult {
  diagnoses: number;
  outcomes: number;
  interventions: number;
  linkages: number;
}

/**
 * Importa um catálogo de taxonomias de enfermagem — idempotente por (code, edition) nos
 * três sistemas, e por (diagnóstico, papel, alvo) nas ligações. Registros já existentes
 * são ignorados silenciosamente (permite reexecutar o importador com segurança).
 */
export async function importTaxonomyCatalog(
  deps: ImportTaxonomyCatalogDeps,
  catalog: TaxonomyCatalog,
): Promise<ImportTaxonomyCatalogResult> {
  let diagnosesImported = 0;
  for (const props of catalog.diagnoses) {
    if (await deps.diagnoses.findByCode(props.code)) {
      continue;
    }
    await deps.diagnoses.save(NursingDiagnosis.create(props));
    diagnosesImported += 1;
  }

  let outcomesImported = 0;
  for (const props of catalog.outcomes) {
    if (await deps.outcomes.findByCode(props.code)) {
      continue;
    }
    await deps.outcomes.save(NursingOutcome.create(props));
    outcomesImported += 1;
  }

  let interventionsImported = 0;
  for (const props of catalog.interventions) {
    if (await deps.interventions.findByCode(props.code)) {
      continue;
    }
    await deps.interventions.save(NursingIntervention.create(props));
    interventionsImported += 1;
  }

  let linkagesImported = 0;
  for (const props of catalog.linkages) {
    const existing = await deps.linkages.findByDiagnosisCode(props.diagnosisCode, props.role);
    if (existing.some((linkage) => linkage.targetCode === props.targetCode)) {
      continue;
    }
    await deps.linkages.save(TaxonomyLinkage.create(props));
    linkagesImported += 1;
  }

  return {
    diagnoses: diagnosesImported,
    outcomes: outcomesImported,
    interventions: interventionsImported,
    linkages: linkagesImported,
  };
}

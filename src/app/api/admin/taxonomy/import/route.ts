import { getRepositories } from "@/infrastructure/container";
import { importTaxonomyCatalog } from "@/application/taxonomy/import-taxonomy-catalog";
import {
  STOMATHERAPY_DIAGNOSES,
  STOMATHERAPY_INTERVENTIONS,
  STOMATHERAPY_LINKAGES,
  STOMATHERAPY_OUTCOMES,
} from "@/infrastructure/persistence/taxonomy-seed/stomatherapy-seed";
import { handleRequest } from "@/lib/api-response";

/**
 * Bootstrap do catálogo de taxonomias com o subset curado de estomaterapia —
 * idempotente (ver importTaxonomyCatalog). Uma implantação real importa o
 * catálogo licenciado do cliente via `scripts/import-taxonomy.ts <arquivo>`.
 */
export async function POST() {
  return handleRequest(async () => {
    const { nursingDiagnoses, nursingOutcomes, nursingInterventions, taxonomyLinkages } =
      await getRepositories();
    return importTaxonomyCatalog(
      {
        diagnoses: nursingDiagnoses,
        outcomes: nursingOutcomes,
        interventions: nursingInterventions,
        linkages: taxonomyLinkages,
      },
      {
        diagnoses: STOMATHERAPY_DIAGNOSES,
        outcomes: STOMATHERAPY_OUTCOMES,
        interventions: STOMATHERAPY_INTERVENTIONS,
        linkages: STOMATHERAPY_LINKAGES,
      },
    );
  });
}

import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { importTaxonomyCatalog } from "@/application/taxonomy/import-taxonomy-catalog";
import {
  STOMATHERAPY_DIAGNOSES,
  STOMATHERAPY_INTERVENTIONS,
  STOMATHERAPY_LINKAGES,
  STOMATHERAPY_OUTCOMES,
} from "@/infrastructure/persistence/taxonomy-seed/stomatherapy-seed";
import { fail, handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";

/**
 * Bootstrap do catálogo de taxonomias com o subset curado de estomaterapia —
 * idempotente (ver importTaxonomyCatalog). Uma implantação real importa o
 * catálogo licenciado do cliente via `scripts/import-taxonomy.ts <arquivo>`.
 */
export async function POST(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) {
    return fail("Não autenticado", 401);
  }
  if (session.role !== "admin") {
    return fail("Rota exclusiva de administração", 403);
  }

  return handleRequest(async () => {
    const { nursingDiagnoses, nursingOutcomes, nursingInterventions, taxonomyLinkages, auditEvents } =
      await getRepositories();
    const result = await importTaxonomyCatalog(
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
    recordAudit(auditEvents, session, {
      action: "create",
      resourceType: "taxonomy_catalog",
      resourceId: "stomatherapy-seed",
    });
    return result;
  });
}

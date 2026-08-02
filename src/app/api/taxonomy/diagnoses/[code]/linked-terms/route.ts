import { getRepositories } from "@/infrastructure/container";
import { SuggestLinkedTerms } from "@/application/taxonomy/suggest-linked-terms";
import { handleRequest } from "@/lib/api-response";
import { toNursingInterventionDto, toNursingOutcomeDto } from "@/lib/dto";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return handleRequest(async () => {
    const { code } = await context.params;
    const { taxonomyLinkages, nursingOutcomes, nursingInterventions } = await getRepositories();
    const linked = await new SuggestLinkedTerms(
      taxonomyLinkages,
      nursingOutcomes,
      nursingInterventions,
    ).execute({ diagnosisCode: code });
    return {
      outcomes: linked.outcomes.map(toNursingOutcomeDto),
      interventions: linked.interventions.map(toNursingInterventionDto),
    };
  });
}

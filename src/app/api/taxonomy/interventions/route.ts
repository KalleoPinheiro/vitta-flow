import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { SearchInterventions } from "@/application/taxonomy/search-interventions";
import { handleRequest } from "@/lib/api-response";
import { toNursingInterventionDto } from "@/lib/dto";

export async function GET(request: NextRequest) {
  return handleRequest(async () => {
    const term = request.nextUrl.searchParams.get("q") ?? "";
    const { nursingInterventions } = await getRepositories();
    const result = await new SearchInterventions(nursingInterventions).execute({ term });
    return result.map(toNursingInterventionDto);
  });
}

import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { SearchInterventions } from "@/application/taxonomy/search-interventions";
import { handleRequest } from "@/lib/api-response";
import { toNursingInterventionDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const term = request.nextUrl.searchParams.get("q") ?? "";
    const { nursingInterventions } = await getRepositories();
    const result = await new SearchInterventions(nursingInterventions).execute({ term });
    return result.map(toNursingInterventionDto);
  });
}

import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { SearchDiagnoses } from "@/application/taxonomy/search-diagnoses";
import { handleRequest } from "@/lib/api-response";
import { toNursingDiagnosisDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const term = request.nextUrl.searchParams.get("q") ?? "";
    const { nursingDiagnoses } = await getRepositories();
    const result = await new SearchDiagnoses(nursingDiagnoses).execute({ term });
    return result.map(toNursingDiagnosisDto);
  });
}

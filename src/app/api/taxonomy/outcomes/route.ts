import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { SearchOutcomes } from "@/application/taxonomy/search-outcomes";
import { handleRequest } from "@/lib/api-response";
import { toNursingOutcomeDto } from "@/lib/dto";

export async function GET(request: NextRequest) {
  return handleRequest(async () => {
    const term = request.nextUrl.searchParams.get("q") ?? "";
    const { nursingOutcomes } = await getRepositories();
    const result = await new SearchOutcomes(nursingOutcomes).execute({ term });
    return result.map(toNursingOutcomeDto);
  });
}

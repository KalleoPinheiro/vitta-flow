import { getRepositories } from "@/infrastructure/container";
import { GetSupplyInsights } from "@/application/inventory/get-supply-insights";
import { handleRequest } from "@/lib/api-response";

export async function GET() {
  return handleRequest(async () => {
    const { supplies, stockMovements, supplyBatches } = await getRepositories();
    const insights = await new GetSupplyInsights(
      supplies,
      stockMovements,
      supplyBatches,
    ).execute();
    return {
      bySupply: insights.bySupply,
      expiringBatches: insights.expiringBatches.map((batch) => ({
        ...batch,
        expiresAt: batch.expiresAt.toISOString(),
      })),
    };
  });
}

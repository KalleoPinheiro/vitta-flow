import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { GetMonthlyReport } from "@/application/reports/get-monthly-report";
import { handleRequest, fail } from "@/lib/api-response";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  if (month && !MONTH_REGEX.test(month)) {
    return fail("Parâmetro month deve estar no formato YYYY-MM", 400);
  }

  return handleRequest(async () => {
    const now = new Date();
    const [year, monthIndex] = month
      ? [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1]
      : [now.getFullYear(), now.getMonth()];
    const from = new Date(year, monthIndex, 1);
    const to = new Date(year, monthIndex + 1, 1);

    const { appointments, invoices } = await getRepositories();
    return new GetMonthlyReport(appointments, invoices).execute({ from, to });
  });
}

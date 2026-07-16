import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { GetBillingSummary } from "@/application/billing/get-billing-summary";
import { ListAppointments } from "@/application/appointments/list-appointments";
import { handleRequest, fail } from "@/lib/api-response";
import { toAppointmentDto } from "@/lib/dto";

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

    const { appointments, patients, invoices } = await getRepositories();
    const billing = await new GetBillingSummary(invoices).execute({ from, to });
    const monthAppointments = await new ListAppointments(appointments, patients).execute({
      from,
      to,
    });

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const todayAppointments = await new ListAppointments(appointments, patients).execute({
      from: startOfToday,
      to: endOfToday,
    });

    return {
      billing,
      appointmentsInMonth: monthAppointments.length,
      today: todayAppointments.map(({ appointment, patientName }) =>
        toAppointmentDto(appointment, patientName),
      ),
    };
  });
}

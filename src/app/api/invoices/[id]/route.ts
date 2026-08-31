import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { PayInvoice } from "@/application/billing/pay-invoice";
import { CancelInvoice } from "@/application/billing/cancel-invoice";
import { PAYMENT_METHODS } from "@/domain/billing/invoice";
import { handleRequest } from "@/lib/api-response";
import { toInvoiceDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pay"), method: z.enum(PAYMENT_METHODS) }),
  z.object({ action: z.literal("cancel") }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const body = actionSchema.parse(await request.json());
    const { invoices } = await getRepositories({
      clinicId: guard.session?.clinicId ?? LEGACY_CLINIC_ID,
    });

    if (body.action === "pay") {
      return toInvoiceDto(await new PayInvoice(invoices).execute({ id, method: body.method }));
    }
    return toInvoiceDto(await new CancelInvoice(invoices).execute({ id }));
  });
}

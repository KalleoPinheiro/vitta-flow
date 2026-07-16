import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { PayInvoice } from "@/application/billing/pay-invoice";
import { CancelInvoice } from "@/application/billing/cancel-invoice";
import { PAYMENT_METHODS } from "@/domain/billing/invoice";
import { handleRequest } from "@/lib/api-response";
import { toInvoiceDto } from "@/lib/dto";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pay"), method: z.enum(PAYMENT_METHODS) }),
  z.object({ action: z.literal("cancel") }),
]);

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = actionSchema.parse(await request.json());
    const { invoices } = getRepositories();

    if (body.action === "pay") {
      return toInvoiceDto(await new PayInvoice(invoices).execute({ id, method: body.method }));
    }
    return toInvoiceDto(await new CancelInvoice(invoices).execute({ id }));
  });
}

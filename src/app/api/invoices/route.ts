import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { CreateInvoice } from "@/application/billing/create-invoice";
import { ListInvoices } from "@/application/billing/list-invoices";
import { INVOICE_STATUSES } from "@/domain/billing/invoice";
import { handleRequest } from "@/lib/api-response";
import { toInvoiceDto } from "@/lib/dto";

const createInvoiceSchema = z.object({
  patientId: z.string().min(1),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  appointmentId: z.string().nullish(),
  dueDate: z.iso.datetime().nullish(),
});

const statusSchema = z.enum(INVOICE_STATUSES).optional();

export async function GET(request: NextRequest) {
  return handleRequest(async () => {
    const params = request.nextUrl.searchParams;
    const status = statusSchema.parse(params.get("status") ?? undefined);
    const from = params.get("from");
    const to = params.get("to");
    const patientId = params.get("patientId") ?? undefined;

    const { invoices, patients } = getRepositories();
    const result = await new ListInvoices(invoices, patients).execute({
      status,
      patientId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return result.map(({ invoice, patientName }) => toInvoiceDto(invoice, patientName));
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = createInvoiceSchema.parse(await request.json());
    const { invoices, patients } = getRepositories();
    const invoice = await new CreateInvoice(invoices, patients).execute({
      patientId: body.patientId,
      description: body.description,
      amountCents: body.amountCents,
      appointmentId: body.appointmentId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    });
    return toInvoiceDto(invoice);
  });
}

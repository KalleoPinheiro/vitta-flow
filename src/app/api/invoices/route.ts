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
  description: z.string().min(1).max(500),
  amountCents: z.number().int().positive().max(1_000_000_000),
  appointmentId: z.string().nullish(),
  dueDate: z.iso.datetime().nullish(),
});

const statusSchema = z.enum(INVOICE_STATUSES).optional();

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  return handleRequest(async () => {
    const params = request.nextUrl.searchParams;
    const status = statusSchema.parse(params.get("status") ?? undefined);
    const from = params.get("from");
    const to = params.get("to");
    const patientId = params.get("patientId") ?? undefined;

    const { limit, offset } = paginationSchema.parse({
      limit: params.get("limit") ?? undefined,
      offset: params.get("offset") ?? undefined,
    });

    const { invoices, patients } = await getRepositories();
    const result = await new ListInvoices(invoices, patients).execute(
      {
        status,
        patientId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
      { limit, offset },
    );
    return result.map(({ invoice, patientName }) => toInvoiceDto(invoice, patientName));
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = createInvoiceSchema.parse(await request.json());
    const { invoices, patients } = await getRepositories();
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

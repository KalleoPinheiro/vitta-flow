import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { GetAnamnesis } from "@/application/clinical/get-anamnesis";
import { UpsertAnamnesis } from "@/application/clinical/upsert-anamnesis";
import { handleRequest } from "@/lib/api-response";
import { toAnamnesisDto } from "@/lib/dto";

const anamnesisSchema = z.object({
  comorbidities: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  surgicalHistory: z.string().optional(),
  notes: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { anamneses } = await getRepositories();
    const anamnesis = await new GetAnamnesis(anamneses).execute({ patientId: id });
    return anamnesis ? toAnamnesisDto(anamnesis) : null;
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = anamnesisSchema.parse(await request.json());
    const { anamneses, patients } = await getRepositories();
    const anamnesis = await new UpsertAnamnesis(anamneses, patients).execute({
      patientId: id,
      ...body,
    });
    return toAnamnesisDto(anamnesis);
  });
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { Professional } from "@/domain/professional/professional";
import { handleRequest } from "@/lib/api-response";
import { toProfessionalDto } from "@/lib/dto";

const professionalSchema = z.object({
  fullName: z.string().min(1).max(200),
  registry: z.string().max(100).nullish(),
});

export async function GET() {
  return handleRequest(async () => {
    const { professionals } = await getRepositories();
    const result = await professionals.findAll();
    return result.map(toProfessionalDto);
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = professionalSchema.parse(await request.json());
    const { professionals } = await getRepositories();
    const professional = Professional.create({
      fullName: body.fullName,
      registry: body.registry ?? null,
    });
    await professionals.save(professional);
    return toProfessionalDto(professional);
  });
}

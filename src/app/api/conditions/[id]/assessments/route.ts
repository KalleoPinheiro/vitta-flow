import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { AddConditionAssessment } from "@/application/clinical/add-condition-assessment";
import { EXUDATE_LEVELS } from "@/domain/clinical/condition-assessment";
import { handleRequest } from "@/lib/api-response";
import { toAssessmentDto } from "@/lib/dto";

const assessmentSchema = z.object({
  lengthMm: z.number().int().min(0).max(10_000).nullish(),
  widthMm: z.number().int().min(0).max(10_000).nullish(),
  depthMm: z.number().int().min(0).max(10_000).nullish(),
  tissueType: z.string().max(200).nullish(),
  exudate: z.enum(EXUDATE_LEVELS).nullish(),
  painScale: z.number().int().min(0).max(10).nullish(),
  skinCondition: z.string().max(1000).nullish(),
  complications: z.string().max(1000).nullish(),
  notes: z.string().max(5000).nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { assessments } = await getRepositories();
    const result = await assessments.findByConditionId(id);
    return result.map(toAssessmentDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = assessmentSchema.parse(await request.json());
    const { assessments, conditions } = await getRepositories();
    const assessment = await new AddConditionAssessment(assessments, conditions).execute({
      conditionId: id,
      ...body,
    });
    return toAssessmentDto(assessment);
  });
}

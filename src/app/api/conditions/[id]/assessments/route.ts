import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { AddConditionAssessment } from "@/application/clinical/add-condition-assessment";
import { EXUDATE_LEVELS } from "@/domain/clinical/condition-assessment";
import { handleRequest } from "@/lib/api-response";
import { toAssessmentDto } from "@/lib/dto";

const assessmentSchema = z.object({
  lengthMm: z.number().int().nullish(),
  widthMm: z.number().int().nullish(),
  depthMm: z.number().int().nullish(),
  tissueType: z.string().nullish(),
  exudate: z.enum(EXUDATE_LEVELS).nullish(),
  painScale: z.number().int().nullish(),
  skinCondition: z.string().nullish(),
  complications: z.string().nullish(),
  notes: z.string().nullish(),
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

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { AddCarePlanDiagnosis } from "@/application/clinical/add-care-plan-diagnosis";
import { CARE_PLAN_DIAGNOSIS_TYPES } from "@/domain/clinical/care-plan-diagnosis";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toCarePlanDiagnosisDto } from "@/lib/dto";

const diagnosisSchema = z.object({
  diagnosisCode: z.string().min(1).max(20),
  type: z.enum(CARE_PLAN_DIAGNOSIS_TYPES),
  relatedFactors: z.string().max(2000).nullish(),
  definingCharacteristics: z.string().max(2000).nullish(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = diagnosisSchema.parse(await request.json());
    const { carePlanDiagnoses, carePlans, nursingDiagnoses, auditEvents } = await getRepositories();
    const diagnosis = await new AddCarePlanDiagnosis(
      carePlanDiagnoses,
      carePlans,
      nursingDiagnoses,
    ).execute({
      carePlanId: id,
      diagnosisCode: body.diagnosisCode,
      type: body.type,
      relatedFactors: body.relatedFactors ?? null,
      definingCharacteristics: body.definingCharacteristics ?? null,
    });
    const [plan, catalogEntry] = await Promise.all([
      carePlans.findById(id),
      nursingDiagnoses.findByCode(body.diagnosisCode),
    ]);
    recordAudit(auditEvents, getRequestSession(request), {
      action: "create",
      resourceType: "care_plan_diagnosis",
      resourceId: diagnosis.id,
      patientId: plan?.patientId ?? null,
    });
    return toCarePlanDiagnosisDto(diagnosis, catalogEntry?.label ?? diagnosis.diagnosisCode);
  });
}

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { DeleteConditionPhoto } from "@/application/clinical/delete-condition-photo";
import { FollowUp } from "@/domain/followup/follow-up";
import { NotFoundError } from "@/domain/shared/errors";
import { handleRequest, fail } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit, recordAuditNow } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

/** Serve o binário da foto — rota exclusiva do staff (proxy barra portais). */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { conditionPhotos, photoStorage } = await getRepositories();

  const photo = await conditionPhotos.findById(id);
  const data = photo ? await photoStorage.read(photo.id) : null;
  if (!photo || !data) {
    return fail("Foto não encontrada", 404);
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { conditionPhotos, photoStorage, conditions, auditEvents } = await getRepositories();

    const photo = await conditionPhotos.findById(id);
    const condition = photo ? await conditions.findById(photo.conditionId) : null;
    await new DeleteConditionPhoto(conditionPhotos, photoStorage).execute({ id });

    // Write-ahead (SEC1-21): exclusão de dado clínico exige trilha antes do sucesso.
    await recordAuditNow(auditEvents, getRequestSession(request), {
      action: "delete",
      resourceType: "photo",
      resourceId: id,
      patientId: condition?.patientId ?? null,
      detail: "correção de upload",
    });
    return { deleted: true };
  });
}

const triageSchema = z.object({ triage: z.enum(["reviewed", "escalated"]) });

/**
 * Triagem da foto do paciente (O4.2): "reviewed" mantém o plano;
 * "escalated" antecipa o retorno criando follow-up com vencimento imediato.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = triageSchema.parse(await request.json());
    const { conditionPhotos, conditions, followUps, auditEvents } = await getRepositories();

    const photo = await conditionPhotos.findById(id);
    if (!photo) {
      throw new NotFoundError("Foto", id);
    }
    const condition = await conditions.findById(photo.conditionId);

    const triaged = photo.withTriage(body.triage);
    await conditionPhotos.save(triaged);

    if (body.triage === "escalated" && condition) {
      await followUps.save(
        FollowUp.create({
          patientId: condition.patientId,
          appointmentId: null,
          dueDate: new Date(),
          reason: `Retorno antecipado: foto de ${condition.title} sinaliza atenção`,
        }),
      );
    }

    recordAudit(auditEvents, getRequestSession(request), {
      action: "update",
      resourceType: "photo",
      resourceId: id,
      patientId: condition?.patientId ?? null,
      detail: `triagem: ${body.triage}`,
    });
    return { id, triageStatus: triaged.triageStatus };
  });
}

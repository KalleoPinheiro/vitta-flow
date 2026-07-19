import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { AddConditionPhoto } from "@/application/clinical/add-condition-photo";
import { MAX_PHOTO_BYTES } from "@/domain/clinical/condition-photo";
import { getRequestSession } from "@/lib/auth/request-session";
import { handleRequest, fail } from "@/lib/api-response";
import { recordAudit } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

/**
 * Monitoramento remoto (O4.2): paciente envia foto da própria condição ativa.
 * Mesmo pipeline do F6 (magic bytes, 5 MB, storage privado); entra na fila de
 * triagem da equipe como origem "patient".
 */
export async function POST(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) {
    return fail("Não autenticado", 401);
  }
  if (session.role !== "patient") {
    return fail("Rota exclusiva do portal do paciente", 403);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const conditionId = form?.get("conditionId");
  if (!(file instanceof File) || typeof conditionId !== "string" || !conditionId) {
    return fail("Envie 'file' e 'conditionId' (multipart/form-data)", 400);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return fail("Imagem excede o limite de 5 MB", 400);
  }
  const note = form?.get("note");

  return handleRequest(async () => {
    const { patients, conditions, conditionPhotos, photoStorage, auditEvents } =
      await getRepositories();

    const patient = await patients.findByEmail(session.subject);
    const condition = await conditions.findById(conditionId);
    // Escopo da sessão: só condição do próprio paciente, e ativa.
    if (!patient || !condition || condition.patientId !== patient.id) {
      throw new NotFoundError("Condição", conditionId);
    }
    if (condition.status !== "active") {
      throw new ValidationError("Condição já resolvida — fale com a clínica");
    }

    const photo = await new AddConditionPhoto(
      conditionPhotos,
      conditions,
      photoStorage,
    ).execute({
      conditionId,
      data: new Uint8Array(await file.arrayBuffer()),
      origin: "patient",
      patientNote: typeof note === "string" && note ? note.slice(0, 500) : null,
    });

    recordAudit(auditEvents, session, {
      action: "create",
      resourceType: "photo",
      resourceId: photo.id,
      patientId: patient.id,
      detail: "envio remoto do paciente",
    });
    return { id: photo.id, triageStatus: photo.triageStatus };
  });
}

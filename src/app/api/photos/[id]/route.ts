import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { DeleteConditionPhoto } from "@/application/clinical/delete-condition-photo";
import { handleRequest, fail } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";

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

    recordAudit(auditEvents, getRequestSession(request), {
      action: "delete",
      resourceType: "photo",
      resourceId: id,
      patientId: condition?.patientId ?? null,
      detail: "correção de upload",
    });
    return { deleted: true };
  });
}

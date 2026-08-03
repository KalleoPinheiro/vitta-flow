import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { handleRequest } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth/require-session";

/** Fila de triagem (staff): fotos enviadas por pacientes aguardando avaliação. */
export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { conditionPhotos, conditions, patients } = await getRepositories();
    const pending = await conditionPhotos.findPendingTriage();

    const conditionIds = [...new Set(pending.map((photo) => photo.conditionId))];
    const conditionList = await Promise.all(
      conditionIds.map((id) => conditions.findById(id)),
    );
    const conditionById = new Map(
      conditionList.filter((c) => c !== null).map((c) => [c.id, c]),
    );
    const patientList = await patients.findByIds(
      [...conditionById.values()].map((c) => c.patientId),
    );
    const patientById = new Map(patientList.map((p) => [p.id, p]));

    return pending.map((photo) => {
      const condition = conditionById.get(photo.conditionId);
      const patient = condition ? patientById.get(condition.patientId) : undefined;
      return {
        id: photo.id,
        conditionId: photo.conditionId,
        conditionTitle: condition?.title ?? "—",
        patientId: condition?.patientId ?? null,
        patientName: patient?.fullName ?? "—",
        patientNote: photo.patientNote,
        createdAt: photo.createdAt.toISOString(),
      };
    });
  });
}

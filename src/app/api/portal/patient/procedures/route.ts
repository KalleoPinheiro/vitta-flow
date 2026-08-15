import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { requireRole } from "@/lib/auth/guard";
import { handleRequest } from "@/lib/api-response";
import { toProcedureDto } from "@/lib/dto";

/**
 * Catálogo ofertável ao paciente no auto-agendamento. Rota própria do portal:
 * o RBAC do proxy é por prefixo e /api/procedures é exclusiva da equipe.
 */
export async function GET(request: NextRequest) {
  const { error } = requireRole(request, "patient");
  if (error) {
    return error;
  }

  return handleRequest(async () => {
    const { procedures } = await getRepositories();
    const catalog = await procedures.findAll();
    return catalog.filter((procedure) => procedure.isActive).map(toProcedureDto);
  });
}

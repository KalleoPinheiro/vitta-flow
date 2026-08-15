import type { NextRequest } from "next/server";
import { getRequestSession } from "./request-session";
import type { Session, UserRole } from "./session";
import { fail } from "@/lib/api-response";

const FORBIDDEN_MESSAGES: Record<UserRole, string> = {
  admin: "Acesso restrito à equipe da clínica",
  partner: "Rota exclusiva do portal do parceiro",
  patient: "Rota exclusiva do portal do paciente",
};

export type RoleGuardResult =
  | { session: Session; error?: undefined }
  | { session?: undefined; error: Response };

/**
 * Guard único de papel para rotas de API: 401 sem sessão, 403 com papel
 * diferente do exigido. Centraliza o padrão antes repetido em cada rota do
 * portal — um esquecimento de checagem não vira furo de escopo.
 */
export function requireRole(request: NextRequest, role: UserRole): RoleGuardResult {
  const session = getRequestSession(request);
  if (!session) {
    return { error: fail("Não autenticado", 401) };
  }
  if (session.role !== role) {
    return { error: fail(FORBIDDEN_MESSAGES[role], 403) };
  }
  return { session };
}

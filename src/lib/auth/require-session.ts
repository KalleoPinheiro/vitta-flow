import type { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/domain/auth/user-role";
import { fail } from "@/lib/api-response";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  STAFF_ONLY_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
  resolveAuthMode,
} from "./access-policy";
import { getRequestSession } from "./request-session";
import type { Session } from "./session";

/**
 * Camada 2 de autorização: guarda executada DENTRO de cada route handler.
 *
 * O proxy (`src/proxy.ts`) já barra a requisição na borda, mas a própria doc do
 * Next 16 diz que ele é uma checagem otimista e não deve ser a única barreira.
 * Esta guarda garante que a rota se recusa a executar sem sessão mesmo se o
 * `matcher` do proxy for alterado, se a rota for chamada fora do pipeline HTTP
 * (teste, script, RPC interno) ou se um handler novo nascer num grupo liberado.
 *
 * Uso — sempre a PRIMEIRA instrução do handler, antes de ler `params` ou tocar
 * o banco:
 *
 *   export async function POST(request: NextRequest) {
 *     const guard = requireStaffSession(request);
 *     if (!guard.ok) return guard.response;
 *     ...
 *   }
 */
export type Guard<S> = { ok: true; session: S } | { ok: false; response: NextResponse };

const denied = (message: string, status: number): Guard<never> => ({
  ok: false,
  response: fail(message, status),
});

const roleMessage = (roles: readonly UserRole[]): string => {
  if (roles.length === 1 && roles[0] === "patient") {
    return "Rota exclusiva do portal do paciente";
  }
  if (roles.length === 1 && roles[0] === "partner") {
    return "Rota exclusiva do portal do parceiro";
  }
  return STAFF_ONLY_MESSAGE;
};

/**
 * Rotas da equipe (papel `admin`).
 *
 * Espelha a semântica do proxy: em "modo aberto" (sem autenticação configurada
 * e com `VITTA_ALLOW_OPEN_MODE=true`, nunca em produção) a rota executa com
 * `session: null` — a auditoria registra o ator `anonymous`, como já fazia.
 */
export function requireStaffSession(request: NextRequest): Guard<Session | null> {
  const mode = resolveAuthMode();
  if (mode === "unconfigured") {
    return denied(AUTH_NOT_CONFIGURED_MESSAGE, 503);
  }
  if (mode === "open") {
    return { ok: true, session: null };
  }

  const session = getRequestSession(request);
  if (!session) {
    return denied(UNAUTHENTICATED_MESSAGE, 401);
  }
  if (session.role !== "admin") {
    return denied(STAFF_ONLY_MESSAGE, 403);
  }
  return { ok: true, session };
}

/**
 * Rotas do portal (paciente/parceiro). Diferente da guarda de equipe, exige
 * sessão REAL mesmo em modo aberto: o handler identifica o titular dos dados
 * por `session.subject`, então sem sessão não há o que responder.
 */
export function requirePortalSession(
  request: NextRequest,
  roles: UserRole | readonly UserRole[],
): Guard<Session> {
  const allowed = typeof roles === "string" ? ([roles] as const) : roles;

  if (resolveAuthMode() === "unconfigured") {
    return denied(AUTH_NOT_CONFIGURED_MESSAGE, 503);
  }

  const session = getRequestSession(request);
  if (!session) {
    return denied(UNAUTHENTICATED_MESSAGE, 401);
  }
  if (!allowed.includes(session.role)) {
    return denied(roleMessage(allowed), 403);
  }
  return { ok: true, session };
}

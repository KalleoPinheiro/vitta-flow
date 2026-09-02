import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getRequestSession } from "@/lib/auth/request-session";
import { getRepositories } from "@/infrastructure/container";
import { recordAuditNow } from "@/lib/audit";

export async function POST(request: NextRequest) {
  // Lê a sessão ANTES de limpar o cookie — sem sessão só não audita, não vira
  // erro (o logout ainda precisa limpar o cookie normalmente).
  const session = getRequestSession(request);
  if (session) {
    try {
      const { auditEvents } = await getRepositories({ clinicId: session.clinicId });
      // AC-03 não define a `action` — "delete" reflete o encerramento da sessão
      // (spec-precision gap: valor exato não especificado no spec.md).
      await recordAuditNow(auditEvents, session, {
        action: "delete",
        resourceType: "session",
        resourceId: session.subject,
      });
    } catch (error) {
      // Falha de auditoria nunca pode impedir o logout — indisponibilidade
      // transitória do banco não pode travar quem está tentando sair.
      console.error("Auditoria: falha ao registrar logout", error);
    }
  }

  const response = NextResponse.json({ success: true, data: { ok: true }, error: null });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

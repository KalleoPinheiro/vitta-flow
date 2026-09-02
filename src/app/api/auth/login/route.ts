import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getAuthConfig,
  sessionCookieOptions,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/client-ip";
import { verifyPassword } from "@/lib/auth/password";
import { getRepositories } from "@/infrastructure/container";
import { fail } from "@/lib/api-response";
import { recordAuditNow } from "@/lib/audit";
import type { UserRole } from "@/domain/auth/user-role";

const LOGIN_RATE_LIMIT = new RateLimiter(5, 60_000);

/**
 * Único caminho de login desde a ADR-004: e-mail + senha da própria conta.
 * `email` é obrigatório — não existe mais senha mestre nem login por Google.
 */
const loginSchema = z.object({
  email: z.string().min(3).max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!LOGIN_RATE_LIMIT.allow(ip)) {
    return fail("Muitas tentativas de login, aguarde um minuto", 429);
  }

  const auth = getAuthConfig();
  if (!auth) {
    return fail("Autenticação não configurada no servidor", 503);
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("Credenciais inválidas", 401);
  }

  const { auditEvents } = await getRepositories({ clinicId: null });
  const identity = await authenticateAccount(parsed.data.email, parsed.data.password);
  if ("error" in identity) {
    // Ator anônimo pré-sessão: nunca revela no evento se a conta existe além
    // do que a própria resposta HTTP já revela (AC-02).
    await recordAuditNow(auditEvents, null, {
      action: "read",
      resourceType: "session",
      resourceId: parsed.data.email,
      detail: "invalid_credentials",
      actorOverride: { role: "anonymous", id: parsed.data.email, clinicId: null },
    });
    return fail(identity.error, identity.status);
  }

  await recordAuditNow(auditEvents, null, {
    action: "read",
    resourceType: "session",
    resourceId: identity.subject,
    actorOverride: { role: identity.role, id: identity.subject, clinicId: identity.clinicId },
  });

  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const response = NextResponse.json({ success: true, data: { ok: true }, error: null });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(
      auth.secret,
      expiresAtMs,
      identity.subject,
      identity.role,
      identity.clinicId,
      identity.professionalId,
    ),
    sessionCookieOptions(),
  );
  return response;
}

type AuthResult =
  | { subject: string; role: UserRole; clinicId: string | null; professionalId: string | null }
  | { error: string; status: number };

async function authenticateAccount(email: string, password: string): Promise<AuthResult> {
  const { userAccounts } = await getRepositories({ clinicId: null });
  const account = await userAccounts.findByEmail(email);
  const isValid =
    account?.isActive === true && (await verifyPassword(password, account.passwordHash));
  if (!isValid || !account) {
    return { error: "Email ou senha incorretos", status: 401 };
  }
  // O papel e a empresa vêm sempre da própria conta — nunca um valor fixo por
  // padrão (fix do bug "senha sempre vira admin", RBAC-02/RBAC-04).
  return {
    subject: account.email,
    role: account.role,
    clinicId: account.clinicId,
    professionalId: account.professionalId,
  };
}

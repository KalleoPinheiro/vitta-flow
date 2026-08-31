import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getAuthConfig,
  passwordMatches,
  sessionCookieOptions,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/client-ip";
import { verifyPassword } from "@/lib/auth/password";
import { getRepositories } from "@/infrastructure/container";
import { fail } from "@/lib/api-response";
import type { UserRole } from "@/domain/auth/user-role";

const LOGIN_RATE_LIMIT = new RateLimiter(5, 60_000);

const loginSchema = z.object({
  password: z.string().min(1).max(200),
  /** Presente → login por conta individual; ausente → senha master da clínica. */
  email: z.string().max(200).optional(),
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

  // Identidade da sessão: email da conta individual ou "local" (senha master).
  const identity = parsed.data.email
    ? await authenticateAccount(parsed.data.email, parsed.data.password)
    : authenticateMaster(auth.password, parsed.data.password);
  if ("error" in identity) {
    return fail(identity.error, identity.status);
  }
  const subject = identity.subject;
  if (subject === "local") {
    // Credencial compartilhada corrói a trilha de auditoria (ator "local") —
    // caminho de descontinuação registrado no plano de evolução (Fase 6).
    console.warn(
      "Login com a senha master da clínica — prefira contas individuais para auditoria nominal",
    );
  }

  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const response = NextResponse.json({ success: true, data: { ok: true }, error: null });
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(auth.secret, expiresAtMs, subject, identity.role, identity.clinicId),
    sessionCookieOptions(),
  );
  return response;
}

type AuthResult =
  | { subject: string; role: UserRole; clinicId: string | null }
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
  return { subject: account.email, role: account.role, clinicId: account.clinicId };
}

function authenticateMaster(masterPassword: string | null, password: string): AuthResult {
  if (!masterPassword) {
    return { error: "Login por senha desativado — use conta individual ou Google", status: 403 };
  }
  if (!passwordMatches(masterPassword, password)) {
    return { error: "Senha incorreta", status: 401 };
  }
  // Senha mestre de emergência: acesso cross-empresa, mapeada para super_admin
  // até a remoção da senha mestre na issue #21.
  return { subject: "local", role: "super_admin", clinicId: null };
}

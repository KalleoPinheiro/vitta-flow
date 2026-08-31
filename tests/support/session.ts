import { SESSION_COOKIE, createSessionToken, type UserRole } from "@/lib/auth/session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

/**
 * Helpers de sessão para os testes de rota. As rotas exigem sessão válida
 * (`src/lib/auth/require-session.ts`), então a suíte assina um cookie real com o
 * `AUTH_SECRET` definido em `vitest.config.ts` — o mesmo caminho que o navegador
 * percorre em produção.
 */
const secret = (): string => {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET ausente — defina em vitest.config.ts (test.env)");
  }
  return value;
};

export const sessionToken = (
  role: UserRole = "company_admin",
  subject = "equipe@clinica.com",
  expiresAtMs = Date.now() + 3_600_000,
  clinicId: string | null = LEGACY_CLINIC_ID,
  professionalId: string | null = null,
): string => createSessionToken(secret(), expiresAtMs, subject, role, clinicId, professionalId);

export const cookieHeaderFor = (
  role: UserRole = "company_admin",
  subject?: string,
  clinicId?: string | null,
  professionalId?: string | null,
): Record<string, string> => ({
  cookie: `${SESSION_COOKIE}=${sessionToken(role, subject, undefined, clinicId, professionalId)}`,
});

/** Cabeçalho de sessão da equipe — o papel usado pela maior parte da API. */
export const adminCookieHeader = (clinicId?: string | null): Record<string, string> =>
  cookieHeaderFor("company_admin", undefined, clinicId);

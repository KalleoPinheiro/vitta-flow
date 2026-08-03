import { SESSION_COOKIE, createSessionToken, type UserRole } from "@/lib/auth/session";

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
  role: UserRole = "admin",
  subject = "equipe@clinica.com",
  expiresAtMs = Date.now() + 3_600_000,
): string => createSessionToken(secret(), expiresAtMs, subject, role);

export const cookieHeaderFor = (
  role: UserRole = "admin",
  subject?: string,
): Record<string, string> => ({ cookie: `${SESSION_COOKIE}=${sessionToken(role, subject)}` });

/** Cabeçalho de sessão da equipe — o papel usado pela maior parte da API. */
export const adminCookieHeader = (): Record<string, string> => cookieHeaderFor("admin");

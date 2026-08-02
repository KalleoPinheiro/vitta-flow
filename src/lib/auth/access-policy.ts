import type { UserRole } from "@/domain/auth/user-role";
import { getAuthConfig } from "./session";
import { googleOAuthConfigFromEnv } from "./google-oauth";

/**
 * Política de acesso do VittaFlow — fonte única consumida pelas DUAS camadas de
 * autorização:
 *
 *  1. `src/proxy.ts` (borda): checagem otimista antes de a requisição chegar à
 *     rota — barra o tráfego não autenticado cedo e redireciona páginas.
 *  2. `src/lib/auth/require-session.ts` (handler): autorização efetiva dentro de
 *     cada route handler.
 *
 * A doc do Next 16 é explícita: "Proxy is not intended to be used as a full
 * session management or authorization solution" — por isso a camada 2 existe e
 * por isso as duas precisam ler a MESMA política (allowlists divergentes entre
 * camadas seriam pior do que ter uma só).
 *
 * Este módulo é puro (só `pathname` + env, sem `next/server`), então roda tanto
 * no proxy quanto no handler e é testável isoladamente.
 */

/** Caminhos liberados sem sessão — comparação exata, nunca por prefixo. */
export const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/providers",
  "/api/auth/google",
  "/api/auth/google/callback",
  // Cron externo — a própria rota exige o header x-cron-secret (CRON_SECRET).
  "/api/reminders/run",
] as const;

/** Rotas acessíveis a qualquer papel autenticado; todo o resto é exclusivo do admin (equipe). */
export const SHARED_PATH_PREFIXES = ["/portal", "/api/portal", "/api/auth/logout"] as const;

export const UNAUTHENTICATED_MESSAGE = "Não autenticado";
export const STAFF_ONLY_MESSAGE = "Acesso restrito à equipe da clínica";
export const AUTH_NOT_CONFIGURED_MESSAGE =
  "Autenticação não configurada: defina AUTH_SECRET e AUTH_PASSWORD (ou login Google via GOOGLE_CLIENT_ID/SECRET + APP_URL + GOOGLE_ALLOWED_EMAILS)";

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => path === pathname);
}

export function isSharedPath(pathname: string): boolean {
  return SHARED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Admin (equipe) acessa tudo; paciente e parceiro só os caminhos compartilhados. */
export function isAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === "admin") {
    return true;
  }
  return isSharedPath(pathname);
}

/**
 * - `configured`: autenticação utilizável — exige sessão válida.
 * - `open`: sem autenticação configurada, liberado (só fora de produção).
 * - `unconfigured`: sem autenticação configurada e sem liberação — responde 503.
 */
export type AuthMode = "configured" | "open" | "unconfigured";

const isProduction = (): boolean => process.env.NODE_ENV === "production";

let warnedAuthDisabled = false;

function warnAuthDisabledOnce(): void {
  if (warnedAuthDisabled) {
    return;
  }
  warnedAuthDisabled = true;
  console.warn(
    "⚠ Autenticação DESATIVADA — configure AUTH_SECRET + senha ou Google (permitido apenas em desenvolvimento)",
  );
}

/** Só para testes: zera o estado do aviso "uma vez por processo". */
export function resetAuthModeWarning(): void {
  warnedAuthDisabled = false;
}

/** Um segredo sozinho não autentica ninguém: é preciso senha local OU Google. */
function isAuthUsable(): boolean {
  const auth = getAuthConfig();
  if (!auth) {
    return false;
  }
  return Boolean(auth.password) || Boolean(googleOAuthConfigFromEnv());
}

export function resolveAuthMode(): AuthMode {
  if (isAuthUsable()) {
    return "configured";
  }
  if (isProduction()) {
    return "unconfigured";
  }
  warnAuthDisabledOnce();
  return "open";
}

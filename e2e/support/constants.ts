import { randomBytes } from "node:crypto";

/**
 * Constantes compartilhadas entre `playwright.config.ts`, `global-setup.ts` e os specs.
 *
 * O app exige AUTH_SECRET configurado para qualquer sessão funcionar — inclusive o
 * portal do paciente/parceiro, que chama `getRequestSession()` diretamente (não só o
 * proxy). Por isso a suíte roda com autenticação SEMPRE ligada no servidor principal
 * (porta 3000): login mestre real para specs de equipe, e um cookie de sessão assinado
 * manualmente (mesma assinatura HMAC de `src/lib/auth/session.ts`) para os specs de
 * portal, já que a senha mestre só resolve para super_admin — contas individuais de
 * paciente/parceiro por senha existem (RBAC-02), mas a suíte ainda não semeia uma.
 *
 * Um segundo servidor (porta 3100), sem AUTH_SECRET/AUTH_PASSWORD, sobe em paralelo
 * só para o cenário de "modo aberto" em `auth.spec.ts` — ele tem seu próprio banco
 * PGlite isolado (cada processo Next tem sua própria instância em memória), então só
 * serve para checar navegação sem login, nunca para dados semeados.
 */
export const MAIN_BASE_URL = "http://localhost:3000";
export const MAIN_PORT = 3000;

export const OPEN_MODE_BASE_URL = "http://localhost:3100";
export const OPEN_MODE_PORT = 3100;

/**
 * Credenciais da suíte E2E. Nunca são credenciais de produção.
 *
 * Não ficam mais no código-fonte (GitLeaks `generic-api-key` / Semgrep
 * `hardcoded_secrets`): por padrão são geradas por execução e gravadas de volta em
 * `process.env`. Este módulo é carregado primeiro pelo runner do Playwright (via
 * `playwright.config.ts`); os workers são processos filhos e herdam esse `env`, e o
 * servidor que o próprio Playwright sobe recebe os valores por `webServer.env`
 * (mapeados para `AUTH_SECRET`/`AUTH_PASSWORD`).
 *
 * O alcance para aí: a propagação cobre apenas processos gerenciados pelo Playwright.
 * Um `npm run dev` iniciado à parte lê o `AUTH_SECRET`/`AUTH_PASSWORD` do ambiente
 * dele, e `webServer.env` não é aplicado quando `reuseExistingServer` reaproveita esse
 * processo. Para reaproveitar um servidor já em pé é preciso que os DOIS pares batam:
 * exporte `E2E_AUTH_SECRET`/`E2E_AUTH_PASSWORD` para a suíte e
 * `AUTH_SECRET`/`AUTH_PASSWORD` com os mesmos valores para o servidor.
 */
const secretFromEnv = (name: string, bytes: number): string => {
  const current = process.env[name];
  if (current !== undefined && current.length > 0) {
    return current;
  }
  const generated = randomBytes(bytes).toString("base64url");
  process.env[name] = generated;
  return generated;
};

export const E2E_AUTH_SECRET = secretFromEnv("E2E_AUTH_SECRET", 32);
export const E2E_AUTH_PASSWORD = secretFromEnv("E2E_AUTH_PASSWORD", 18);

export const ADMIN_STORAGE_STATE_PATH = "e2e/.auth/admin-storage.json";
export const SEED_DATA_PATH = "e2e/support/seed-data.json";

/** Mesmo nome de cookie de `src/lib/auth/session.ts` (SESSION_COOKIE). */
export const SESSION_COOKIE_NAME = "vitta_session";

/**
 * Espelha `DEFAULT_SCHEDULE_CONFIG` de `src/domain/scheduling/schedule-config.ts`.
 * `configuracoes.spec.ts` restaura este valor depois de testar grades customizadas,
 * já que o banco PGlite do servidor principal é compartilhado por toda a suíte.
 */
export const DEFAULT_SCHEDULE_CONFIG = {
  weekdays: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 18,
  minGapMinutes: 15,
};

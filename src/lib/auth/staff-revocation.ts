import type { Session } from "./session";

/**
 * Deny-list de sessões staff: a sessão HMAC é stateless (vale 12h), então
 * desativar uma conta em `user_accounts` não invalidava sessões já emitidas.
 * Semântica de deny-list (AD-001): só bloqueia quando a conta EXISTE e está
 * inativa — subject sem linha (login Google via allowlist, senha master) segue
 * válido. Falha de infraestrutura é fail-open com log (AD-004).
 */
export const REVOCATION_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  revoked: boolean;
  expiresAtMs: number;
}

const cache = new Map<string, CacheEntry>();

export type AccountStatusLookup = (email: string) => Promise<{ isActive: boolean } | null>;

async function lookupAccountStatus(email: string): Promise<{ isActive: boolean } | null> {
  const [{ getDb }, { DrizzleUserAccountRepository }] = await Promise.all([
    import("@/infrastructure/persistence/drizzle/db"),
    import("@/infrastructure/persistence/drizzle/drizzle-foundation-repositories"),
  ]);
  const account = await new DrizzleUserAccountRepository(await getDb()).findByEmail(email);
  return account ? { isActive: account.isActive } : null;
}

export async function isStaffSessionRevoked(
  session: Session,
  lookup: AccountStatusLookup = lookupAccountStatus,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (session.role !== "admin" || !session.subject.includes("@")) {
    return false;
  }

  const cached = cache.get(session.subject);
  if (cached && nowMs < cached.expiresAtMs) {
    return cached.revoked;
  }

  try {
    const account = await lookup(session.subject);
    const revoked = account !== null && !account.isActive;
    cache.set(session.subject, { revoked, expiresAtMs: nowMs + REVOCATION_CACHE_TTL_MS });
    return revoked;
  } catch (error) {
    console.error("Revogação de sessão: falha ao consultar conta — fail-open (AD-004)", error);
    return false;
  }
}

/** Limpa o cache — uso em testes e após alterar contas em /configuracoes. */
export function clearStaffRevocationCache(): void {
  cache.clear();
}

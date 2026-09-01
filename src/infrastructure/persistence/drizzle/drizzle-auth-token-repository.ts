import { and, eq, gt, isNull } from "drizzle-orm";
import type { AppDb } from "./db";
import { authTokens } from "./schema";
import {
  AuthToken,
  type AuthTokenPurpose,
  type AuthTokenRepository,
} from "@/domain/auth/auth-token";

export class DrizzleAuthTokenRepository implements AuthTokenRepository {
  constructor(private readonly db: AppDb) {}

  async save(token: AuthToken): Promise<void> {
    const row = {
      id: token.id,
      accountId: token.accountId,
      purpose: token.purpose,
      secretHash: token.secretHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
    await this.db.insert(authTokens).values(row).onConflictDoUpdate({
      target: authTokens.id,
      set: row,
    });
  }

  /**
   * `UPDATE … WHERE used_at IS NULL AND expires_at > now RETURNING *` — uma só
   * declaração. O predicado de validade e a marca de uso acontecem sob o mesmo
   * lock de linha, então de duas requisições concorrentes com o mesmo link
   * exatamente uma recebe a linha; a outra recebe zero linhas e é tratada como
   * link inválido. Um `SELECT` seguido de `UPDATE` deixaria as duas passarem.
   */
  async claimBySecretHash(
    secretHash: string,
    nowMs: number = Date.now(),
  ): Promise<AuthToken | null> {
    const now = new Date(nowMs);
    const rows = await this.db
      .update(authTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokens.secretHash, secretHash),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, now),
        ),
      )
      .returning();
    const row = rows[0];
    if (!row) {
      return null;
    }
    return AuthToken.restore({
      id: row.id,
      accountId: row.accountId,
      purpose: row.purpose as AuthTokenPurpose,
      secretHash: row.secretHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  }

  async markAllUnusedAsUsed(
    accountId: string,
    purpose: AuthTokenPurpose,
    usedAt: Date = new Date(),
  ): Promise<void> {
    await this.db
      .update(authTokens)
      .set({ usedAt })
      .where(
        and(
          eq(authTokens.accountId, accountId),
          eq(authTokens.purpose, purpose),
          isNull(authTokens.usedAt),
        ),
      );
  }
}

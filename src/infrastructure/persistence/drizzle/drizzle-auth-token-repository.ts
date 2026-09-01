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

  /** Filtra usado/expirado no próprio SQL: um token inválido nunca sai do banco. */
  async findUsableBySecretHash(
    secretHash: string,
    nowMs: number = Date.now(),
  ): Promise<AuthToken | null> {
    const rows = await this.db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.secretHash, secretHash),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date(nowMs)),
        ),
      )
      .limit(1);
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

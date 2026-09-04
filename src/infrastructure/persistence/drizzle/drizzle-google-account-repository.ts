import { desc, eq } from 'drizzle-orm';
import type { AppDb } from './db';
import { googleAccounts } from './schema';

export interface GoogleAccount {
  email: string;
  encryptedRefreshToken: string;
  connectedAt: Date;
}

export class DrizzleGoogleAccountRepository {
  constructor(private readonly db: AppDb) {}

  async save(account: GoogleAccount): Promise<void> {
    await this.db
      .insert(googleAccounts)
      .values(account)
      .onConflictDoUpdate({ target: googleAccounts.email, set: account });
  }

  async findByEmail(email: string): Promise<GoogleAccount | null> {
    const rows = await this.db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.email, email))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Conta conectada mais recentemente — usada como credencial do Calendar da clínica. */
  async findMostRecent(): Promise<GoogleAccount | null> {
    const rows = await this.db
      .select()
      .from(googleAccounts)
      .orderBy(desc(googleAccounts.connectedAt))
      .limit(1);
    return rows[0] ?? null;
  }
}

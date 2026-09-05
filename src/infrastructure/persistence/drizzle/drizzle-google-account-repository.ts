import { desc, eq } from 'drizzle-orm';
import type { AppDb } from './db';
import { googleAccounts } from './schema';
import { withTenant } from './tenant-scope';

export interface GoogleAccount {
  email: string;
  encryptedRefreshToken: string;
  connectedAt: Date;
}

const rowId = (clinicId: string | null, email: string): string =>
  `${clinicId ?? 'system'}:${email}`;

export class DrizzleGoogleAccountRepository {
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async save(account: GoogleAccount): Promise<void> {
    const values = {
      id: rowId(this.clinicId, account.email),
      clinicId: this.clinicId,
      ...account,
    };
    await this.db
      .insert(googleAccounts)
      .values(values)
      .onConflictDoUpdate({ target: googleAccounts.id, set: values });
  }

  async findByEmail(email: string): Promise<GoogleAccount | null> {
    const rows = await this.db
      .select()
      .from(googleAccounts)
      .where(
        withTenant(
          googleAccounts,
          this.clinicId,
          eq(googleAccounts.email, email),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Conta conectada mais recentemente **na própria clínica** — credencial do Calendar dela (issue #74). */
  async findMostRecent(): Promise<GoogleAccount | null> {
    const rows = await this.db
      .select()
      .from(googleAccounts)
      .where(withTenant(googleAccounts, this.clinicId))
      .orderBy(desc(googleAccounts.connectedAt))
      .limit(1);
    return rows[0] ?? null;
  }
}

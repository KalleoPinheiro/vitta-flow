import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { sql } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '@/infrastructure/persistence/drizzle/schema';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');
const TARGET_MIGRATION = '0020_add-role-to-user-accounts.sql';

describe('Feature: Migração de backfill de role em user_accounts (RBAC-01)', () => {
  let db: PgliteDatabase<typeof schema>;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
    db = drizzle(client, { schema });

    const priorMigrationsDir = fs.mkdtempSync(
      path.join(process.cwd(), '.tmp-migrate-role-'),
    );
    const priorMeta = path.join(priorMigrationsDir, 'meta');
    fs.mkdirSync(priorMeta);
    const journal = JSON.parse(
      fs.readFileSync(
        path.join(MIGRATIONS_DIR, 'meta', '_journal.json'),
        'utf8',
      ),
    );
    const targetIdx = journal.entries.find(
      (e: { tag: string }) => e.tag === '0020_add-role-to-user-accounts',
    ).idx;
    // Só as migrações estritamente anteriores a 0020 (mesma cautela do teste
    // de backfill de clinic_id: migrações futuras não podem rodar antes dela).
    journal.entries = journal.entries.filter(
      (e: { idx: number }) => e.idx < targetIdx,
    );
    fs.writeFileSync(
      path.join(priorMeta, '_journal.json'),
      JSON.stringify(journal),
    );
    for (const entry of journal.entries) {
      fs.copyFileSync(
        path.join(
          MIGRATIONS_DIR,
          'meta',
          `${String(entry.idx).padStart(4, '0')}_snapshot.json`,
        ),
        path.join(
          priorMeta,
          `${String(entry.idx).padStart(4, '0')}_snapshot.json`,
        ),
      );
      fs.copyFileSync(
        path.join(MIGRATIONS_DIR, `${entry.tag}.sql`),
        path.join(priorMigrationsDir, `${entry.tag}.sql`),
      );
    }

    await migrate(db, { migrationsFolder: priorMigrationsDir });
    fs.rmSync(priorMigrationsDir, { recursive: true, force: true });

    await db.execute(
      sql.raw(
        `INSERT INTO "clinics" (id, name, created_at, created_by) VALUES ('c1','Clinica',now(),'system')`,
      ),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "user_accounts" (id, clinic_id, email, password_hash, active, created_at) VALUES ('u1','c1','u1@x.com','h',true, now())`,
      ),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "user_accounts" (id, clinic_id, email, password_hash, active, created_at) VALUES ('u2','c1','u2@x.com','h',true, now())`,
      ),
    );

    const migrationSql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, TARGET_MIGRATION),
      'utf8',
    );
    for (const statement of migrationSql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed.length > 0) {
        await db.execute(sql.raw(trimmed));
      }
    }
  });

  it("preenche role='company_admin' em 100% das contas existentes, zero linha órfã", async () => {
    const total = await db.execute(
      sql.raw(`SELECT count(*)::int AS c FROM "user_accounts"`),
    );
    const orphans = await db.execute(
      sql.raw(
        `SELECT count(*)::int AS c FROM "user_accounts" WHERE role IS NULL OR role <> 'company_admin'`,
      ),
    );
    expect(Number((total.rows[0] as { c: number }).c)).toBe(2);
    expect(Number((orphans.rows[0] as { c: number }).c)).toBe(0);
  });

  it('permite clinic_id nulo após a migração (papel de sistema)', async () => {
    await db.execute(
      sql.raw(
        `INSERT INTO "user_accounts" (id, clinic_id, email, password_hash, role, active, created_at) VALUES ('u3',NULL,'u3@x.com','h','super_admin',true, now())`,
      ),
    );
    const rows = await db.execute(
      sql.raw(`SELECT clinic_id FROM "user_accounts" WHERE id = 'u3'`),
    );
    expect((rows.rows[0] as { clinic_id: string | null }).clinic_id).toBeNull();
  });
});

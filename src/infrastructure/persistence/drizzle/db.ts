import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Teto de linhas por listagem — protege o banco de queries sem limite (paginação real: P1). */
export const MAX_ROWS = 500;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

const globalForDb = globalThis as unknown as { vittaDbPromise?: Promise<AppDb> };

async function createPgliteDb(): Promise<AppDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as AppDb;
}

/** Lock consultivo compartilhado pelas réplicas — evita corrida de DDL no boot. */
const MIGRATION_LOCK_KEY = 727_001;

function intFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function createPostgresDb(): Promise<AppDb> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { Pool } = await import("pg");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada");
  }
  const pool = new Pool({
    connectionString,
    max: intFromEnv("PG_POOL_MAX", 10),
    connectionTimeoutMillis: intFromEnv("PG_CONNECT_TIMEOUT_MS", 5_000),
    idleTimeoutMillis: intFromEnv("PG_IDLE_TIMEOUT_MS", 30_000),
    statement_timeout: intFromEnv("PG_STATEMENT_TIMEOUT_MS", 15_000),
  });
  const db = drizzle(pool, { schema });

  // Preferir `npm run db:migrate` no deploy; VITTA_MIGRATE_ON_BOOT=false desliga o boot-migrate.
  if (process.env.VITTA_MIGRATE_ON_BOOT !== "false") {
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    } finally {
      await client
        .query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY])
        .catch(() => undefined);
      client.release();
    }
  }
  return db as unknown as AppDb;
}

export function getDb(): Promise<AppDb> {
  if (!globalForDb.vittaDbPromise) {
    globalForDb.vittaDbPromise =
      process.env.VITTA_DB_DRIVER === "pglite" ? createPgliteDb() : createPostgresDb();
  }
  return globalForDb.vittaDbPromise;
}

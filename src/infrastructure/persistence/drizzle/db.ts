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
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as AppDb;
}

async function createPostgresDb(): Promise<AppDb> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { Pool } = await import("pg");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada");
  }
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as AppDb;
}

export function getDb(): Promise<AppDb> {
  if (!globalForDb.vittaDbPromise) {
    globalForDb.vittaDbPromise =
      process.env.VITTA_DB_DRIVER === "pglite" ? createPgliteDb() : createPostgresDb();
  }
  return globalForDb.vittaDbPromise;
}

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { migrate } from "./migrate";

const globalForDb = globalThis as unknown as { vittaDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.vittaDb) {
    const dbPath = process.env.VITTA_DB_PATH ?? path.join(process.cwd(), "data", "vitta.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    migrate(db);
    globalForDb.vittaDb = db;
  }
  return globalForDb.vittaDb;
}

import { readFileSync } from "node:fs";
import { SEED_DATA_PATH } from "./constants";

export interface SeedData {
  professionalId: string;
  procedureWithKitId: string;
  procedureNoKitId: string;
  supplyIds: [string, string];
  batchLabel: string;
}

/** Lê `e2e/support/seed-data.json`, gerado por `e2e/global-setup.ts`. */
export function loadSeedData(): SeedData {
  const raw = readFileSync(SEED_DATA_PATH, "utf-8");
  return JSON.parse(raw) as SeedData;
}

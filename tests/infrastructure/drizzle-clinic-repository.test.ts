import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/infrastructure/persistence/drizzle/schema";
import type { AppDb } from "@/infrastructure/persistence/drizzle/db";
import { DrizzleClinicRepository } from "@/infrastructure/persistence/drizzle/drizzle-clinic-repository";
import { Clinic } from "@/domain/clinic/clinic";

describe("Feature: Persistência de Clinic (Drizzle)", () => {
  let db: PgliteDatabase<typeof schema>;
  let appDb: AppDb;
  let clinicRepo: DrizzleClinicRepository;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    appDb = db as unknown as AppDb;
    clinicRepo = new DrizzleClinicRepository(appDb);
  });

  beforeEach(async () => {
    await db.delete(schema.clinics);
  });

  describe("Cenário: clínica ida e volta (roundtrip)", () => {
    it("Dado uma clínica criada, Quando buscar por id, Então retorna os campos salvos", async () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "super-admin@vitta.com" });

      await clinicRepo.create(clinic);
      const stored = await clinicRepo.findById(clinic.id);

      expect(stored?.id).toBe(clinic.id);
      expect(stored?.name).toBe("Clínica Alfa");
      expect(stored?.createdBy).toBe("super-admin@vitta.com");
      expect(stored?.createdAt).toEqual(clinic.createdAt);
    });

    it("Dado um id inexistente, Quando buscar por id, Então retorna null", async () => {
      const stored = await clinicRepo.findById("00000000-0000-0000-0000-000000000000");

      expect(stored).toBeNull();
    });
  });
});

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

  describe("Cenário: update de dados cadastrais (issue #61)", () => {
    it("Dada uma clínica criada, Quando atualizar os dados cadastrais, Então findById reflete os novos valores", async () => {
      const clinic = Clinic.create({ name: "Clínica Beta", createdBy: "admin@vitta.com" });
      await clinicRepo.create(clinic);

      const updated = clinic.updateInfo({
        cnpj: "12.345.678/0001-90",
        address: "Rua das Flores, 100",
        city: "São Paulo",
        professionalName: "Enf. Ana",
        professionalRegistry: "COREN-SP 123456",
      });
      await clinicRepo.update(updated);
      const stored = await clinicRepo.findById(clinic.id);

      expect(stored?.cnpj).toBe("12.345.678/0001-90");
      expect(stored?.address).toBe("Rua das Flores, 100");
      expect(stored?.city).toBe("São Paulo");
      expect(stored?.professionalName).toBe("Enf. Ana");
      expect(stored?.professionalRegistry).toBe("COREN-SP 123456");
      expect(stored?.name).toBe("Clínica Beta");
      expect(stored?.createdBy).toBe("admin@vitta.com");
    });

    it("Dado update parcial, Quando buscar por id, Então name/createdBy/createdAt permanecem intactos", async () => {
      const clinic = Clinic.create({ name: "Clínica Gama", createdBy: "admin2@vitta.com" });
      await clinicRepo.create(clinic);

      await clinicRepo.update(clinic.updateInfo({ cnpj: "99.999.999/0001-00" }));
      const stored = await clinicRepo.findById(clinic.id);

      expect(stored?.name).toBe("Clínica Gama");
      expect(stored?.createdBy).toBe("admin2@vitta.com");
      expect(stored?.createdAt).toEqual(clinic.createdAt);
    });

    it("Dadas duas clínicas, Quando atualizar uma, Então a outra permanece sem dados cadastrais", async () => {
      const clinicA = Clinic.create({ name: "Clínica A", createdBy: "a@vitta.com" });
      const clinicB = Clinic.create({ name: "Clínica B", createdBy: "b@vitta.com" });
      await clinicRepo.create(clinicA);
      await clinicRepo.create(clinicB);

      await clinicRepo.update(clinicA.updateInfo({ cnpj: "11.111.111/0001-11" }));
      const storedB = await clinicRepo.findById(clinicB.id);

      expect(storedB?.cnpj).toBeNull();
    });
  });
});

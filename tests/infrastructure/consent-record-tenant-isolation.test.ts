import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/infrastructure/persistence/drizzle/schema";
import type { AppDb } from "@/infrastructure/persistence/drizzle/db";
import { DrizzlePatientRepository } from "@/infrastructure/persistence/drizzle/drizzle-patient-repository";
import { DrizzleConsentRecordRepository } from "@/infrastructure/persistence/drizzle/drizzle-clinical-repositories";
import { DrizzleClinicRepository } from "@/infrastructure/persistence/drizzle/drizzle-clinic-repository";
import { Patient } from "@/domain/patient/patient";
import { Clinic } from "@/domain/clinic/clinic";
import { ConsentRecord } from "@/domain/consent/consent-record";

describe("Feature: Isolamento de Consentimento por empresa (MT-27)", () => {
  let db: PgliteDatabase<typeof schema>;
  let appDb: AppDb;
  let patientId: string;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm, btree_gist } });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    appDb = db as unknown as AppDb;

    const clinicRepo = new DrizzleClinicRepository(appDb);
    await clinicRepo.create(
      Clinic.restore({ id: "clinic-b", name: "Clínica B", createdBy: "test", createdAt: new Date() }),
    );

    const patientRepo = new DrizzlePatientRepository(appDb, "legacy-clinic");
    const patient = Patient.create({
      fullName: "Paciente Teste",
      email: "consent-isolation@x.com",
      phone: "11999990000",
    });
    await patientRepo.save(patient);
    patientId = patient.id;

    const consentRepoA = new DrizzleConsentRecordRepository(appDb, "legacy-clinic");
    await consentRepoA.save(
      ConsentRecord.create({
        patientId,
        consentText: "termo v1",
        textVersion: "v1",
        ipAddress: "127.0.0.1",
      }),
    );
  });

  it("Dado consentimento salvo pela clínica A, Quando a clínica B busca pelo mesmo patientId, Então não encontra nada", async () => {
    const consentRepoB = new DrizzleConsentRecordRepository(appDb, "clinic-b");

    const records = await consentRepoB.findByPatientId(patientId);

    expect(records).toHaveLength(0);
  });

  it("Dado consentimento salvo pela clínica A, Quando a própria clínica A busca, Então encontra o registro", async () => {
    const consentRepoA = new DrizzleConsentRecordRepository(appDb, "legacy-clinic");

    const records = await consentRepoA.findByPatientId(patientId);

    expect(records).toHaveLength(1);
  });

  it("Dado papel de sistema (clinicId null), Quando salvar consentimento, Então lança erro", async () => {
    const systemRepo = new DrizzleConsentRecordRepository(appDb, null);

    await expect(
      systemRepo.save(
        ConsentRecord.create({
          patientId,
          consentText: "termo v2",
          textVersion: "v1",
          ipAddress: null,
        }),
      ),
    ).rejects.toThrow("Papel de sistema não pode salvar consentimento");
  });
});

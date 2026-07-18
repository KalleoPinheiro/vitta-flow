import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/infrastructure/persistence/drizzle/schema";
import type { AppDb } from "@/infrastructure/persistence/drizzle/db";
import { DrizzlePatientRepository } from "@/infrastructure/persistence/drizzle/drizzle-patient-repository";
import {
  DrizzleAnamnesisRepository,
  DrizzleClinicalConditionRepository,
  DrizzleConditionAssessmentRepository,
  DrizzleEvolutionNoteRepository,
} from "@/infrastructure/persistence/drizzle/drizzle-clinical-repositories";
import {
  DrizzleFollowUpRepository,
  DrizzleStockMovementRepository,
  DrizzleSupplyRepository,
} from "@/infrastructure/persistence/drizzle/drizzle-inventory-repositories";
import { Patient } from "@/domain/patient/patient";
import { Anamnesis } from "@/domain/clinical/anamnesis";
import { EvolutionNote } from "@/domain/clinical/evolution-note";
import { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import { ConditionAssessment } from "@/domain/clinical/condition-assessment";
import { Supply } from "@/domain/inventory/supply";
import { StockMovement } from "@/domain/inventory/stock-movement";
import { FollowUp } from "@/domain/followup/follow-up";
import { DrizzleGoogleAccountRepository } from "@/infrastructure/persistence/drizzle/drizzle-google-account-repository";
import { DrizzlePartnerRepository } from "@/infrastructure/persistence/drizzle/drizzle-partner-repository";
import { DrizzlePatientRepository as PatientRepo } from "@/infrastructure/persistence/drizzle/drizzle-patient-repository";
import { Partner } from "@/domain/partner/partner";

describe("Feature: Persistência PostgreSQL — módulos clínico, estoque e retornos", () => {
  let db: PgliteDatabase<typeof schema>;
  let appDb: AppDb;
  let patient: Patient;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm } });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    appDb = db as unknown as AppDb;
  });

  beforeEach(async () => {
    await db.delete(schema.googleAccounts);
    await db.update(schema.patients).set({ referredByPartnerId: null });
    await db.delete(schema.conditionAssessments);
    await db.delete(schema.clinicalConditions);
    await db.delete(schema.evolutionNotes);
    await db.delete(schema.anamneses);
    await db.delete(schema.stockMovements);
    await db.delete(schema.supplies);
    await db.delete(schema.followUps);
    await db.delete(schema.patients);
    await db.delete(schema.partners);
    patient = Patient.create({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
    await new DrizzlePatientRepository(appDb).save(patient);
  });

  it("Dado anamnese salva, Quando upsert e buscar, Então dados preservados e atualizados", async () => {
    const repo = new DrizzleAnamnesisRepository(appDb);
    await repo.save(Anamnesis.create({ patientId: patient.id, comorbidities: "DM2" }));

    const stored = await repo.findByPatientId(patient.id);
    await repo.save(stored!.update({ allergies: "Látex" }));

    const updated = await repo.findByPatientId(patient.id);
    expect(updated?.comorbidities).toBe("DM2");
    expect(updated?.allergies).toBe("Látex");
  });

  it("Dado evoluções salvas, Quando listar por paciente, Então ordem cronológica reversa", async () => {
    const repo = new DrizzleEvolutionNoteRepository(appDb);
    await repo.save(
      EvolutionNote.create({ patientId: patient.id, subjective: "Primeira", objective: "", assessment: "", plan: "" }),
    );
    await repo.save(
      EvolutionNote.create({ patientId: patient.id, subjective: "", objective: "Segunda", assessment: "", plan: "" }),
    );

    const notes = await repo.findByPatientId(patient.id);

    expect(notes).toHaveLength(2);
  });

  it("Dado condição com avaliações, Quando salvar e buscar, Então roundtrip completo", async () => {
    const conditionRepo = new DrizzleClinicalConditionRepository(appDb);
    const assessmentRepo = new DrizzleConditionAssessmentRepository(appDb);

    const condition = ClinicalCondition.create({
      patientId: patient.id,
      kind: "stoma",
      title: "Colostomia terminal",
      stomaType: "colostomia",
      startedAt: new Date("2026-01-10T00:00:00Z"),
    });
    await conditionRepo.save(condition);
    await assessmentRepo.save(
      ConditionAssessment.create({
        conditionId: condition.id,
        skinCondition: "Dermatite leve",
        painScale: 2,
      }),
    );

    const storedCondition = await conditionRepo.findById(condition.id);
    const byPatient = await conditionRepo.findByPatientId(patient.id);
    const assessments = await assessmentRepo.findByConditionId(condition.id);

    expect(storedCondition?.stomaType).toBe("colostomia");
    expect(storedCondition?.startedAt).toEqual(new Date("2026-01-10T00:00:00Z"));
    expect(byPatient).toHaveLength(1);
    expect(assessments[0].painScale).toBe(2);

    await conditionRepo.save(condition.resolve());
    expect((await conditionRepo.findById(condition.id))?.status).toBe("resolved");
  });

  it("Dado insumo com movimentações, Quando salvar e buscar, Então estoque e histórico corretos", async () => {
    const supplyRepo = new DrizzleSupplyRepository(appDb);
    const movementRepo = new DrizzleStockMovementRepository(appDb);

    const supply = Supply.create({ name: "Bolsa 60mm", unit: "un", minQty: 10, priceCents: 3500 });
    const stocked = supply.registerEntry(50);
    await supplyRepo.save(stocked);
    await movementRepo.save(
      StockMovement.create({ supplyId: supply.id, type: "in", quantity: 50, reason: "Compra" }),
    );

    const stored = await supplyRepo.findById(supply.id);
    expect(stored?.stockQty).toBe(50);
    expect(stored?.isLowStock).toBe(false);
    expect(await movementRepo.findBySupplyId(supply.id)).toHaveLength(1);
    expect(await supplyRepo.findAll()).toHaveLength(1);
  });

  it("Dado parceiro salvo e paciente indicado, Quando buscar, Então roundtrip e escopo por indicação", async () => {
    const partnerRepo = new DrizzlePartnerRepository(appDb);
    const patientRepo = new PatientRepo(appDb);
    const partner = Partner.create({
      fullName: "Dr. Carlos Andrade",
      email: "carlos@x.com",
      phone: "11955550000",
      crm: "CRM-SP 123456",
      specialty: "Cirurgia vascular",
    });
    await partnerRepo.save(partner);
    await patientRepo.save(patient.update({ referredByPartnerId: partner.id }));

    const storedPartner = await partnerRepo.findByEmail("carlos@x.com");
    expect(storedPartner?.crm).toBe("CRM-SP 123456");
    expect(await partnerRepo.findById(partner.id)).not.toBeNull();
    expect(await partnerRepo.findAll()).toHaveLength(1);

    const referred = await patientRepo.findByReferrer(partner.id);
    expect(referred).toHaveLength(1);
    expect(referred[0].id).toBe(patient.id);
    expect((await patientRepo.findById(patient.id))?.referredByPartnerId).toBe(partner.id);

    await partnerRepo.save(partner.deactivate());
    expect((await partnerRepo.findById(partner.id))?.isActive).toBe(false);
  });

  it("Dado conta Google conectada, Quando salvar e reconectar (upsert), Então guarda a mais recente", async () => {
    const repo = new DrizzleGoogleAccountRepository(appDb);
    await repo.save({
      email: "ana@clinica.com",
      encryptedRefreshToken: "cifrado-v1",
      connectedAt: new Date("2026-07-01T10:00:00Z"),
    });
    await repo.save({
      email: "ana@clinica.com",
      encryptedRefreshToken: "cifrado-v2",
      connectedAt: new Date("2026-07-16T10:00:00Z"),
    });
    await repo.save({
      email: "joao@clinica.com",
      encryptedRefreshToken: "cifrado-j",
      connectedAt: new Date("2026-07-10T10:00:00Z"),
    });

    expect((await repo.findByEmail("ana@clinica.com"))?.encryptedRefreshToken).toBe("cifrado-v2");
    expect((await repo.findMostRecent())?.email).toBe("ana@clinica.com");
  });

  it("Dado retornos, Quando filtrar por status e vencimento, Então subconjuntos corretos", async () => {
    const repo = new DrizzleFollowUpRepository(appDb);
    const pending = FollowUp.create({
      patientId: patient.id,
      dueDate: new Date("2026-07-01T12:00:00Z"),
      reason: "Reavaliação",
    });
    const done = FollowUp.create({
      patientId: patient.id,
      dueDate: new Date("2026-09-01T12:00:00Z"),
      reason: "Retorno",
    }).markDone();
    await repo.save(pending);
    await repo.save(done);

    expect(await repo.findAll({ status: "pending" })).toHaveLength(1);
    expect(await repo.findAll({ dueBefore: new Date("2026-08-01T00:00:00Z") })).toHaveLength(1);
    expect((await repo.findById(done.id))?.status).toBe("done");
  });
});

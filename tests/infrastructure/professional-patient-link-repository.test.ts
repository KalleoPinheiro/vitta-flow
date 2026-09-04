import { sql } from 'drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AppDb } from '@/infrastructure/persistence/drizzle/db';
import { DrizzleProfessionalPatientLinkRepository } from '@/infrastructure/persistence/drizzle/professional-patient-link-repository';
import * as schema from '@/infrastructure/persistence/drizzle/schema';
import { createPgliteFromTemplate } from '../support/pglite-template';

const CLINIC_ID = 'clinic-links';
const CLINIC_OTHER_ID = 'clinic-links-other';

describe('Feature: Repositório de vínculo Profissional-Paciente (R4, RBAC-17/21)', () => {
  let db: PgliteDatabase<typeof schema>;
  let appDb: AppDb;
  let repo: DrizzleProfessionalPatientLinkRepository;

  beforeAll(async () => {
    const client = await createPgliteFromTemplate();
    db = drizzle(client, { schema });
    appDb = db as unknown as AppDb;
    repo = new DrizzleProfessionalPatientLinkRepository(appDb, CLINIC_ID);

    await db.execute(
      sql.raw(
        `INSERT INTO "clinics" (id, name, created_at, created_by) VALUES ('${CLINIC_ID}','Clinica Links',now(),'system')`,
      ),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "clinics" (id, name, created_at, created_by) VALUES ('${CLINIC_OTHER_ID}','Outra Clinica',now(),'system')`,
      ),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "professionals" (id, clinic_id, full_name, active, created_at) VALUES ('prof-1','${CLINIC_ID}','Dr. A',true, now())`,
      ),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "patients" (id, clinic_id, full_name, email, phone, active, created_at) VALUES ('pat-1','${CLINIC_ID}','Paciente 1','pat1@x.com','111',true, now())`,
      ),
    );
    await db.execute(
      sql.raw(
        `INSERT INTO "patients" (id, clinic_id, full_name, email, phone, active, created_at) VALUES ('pat-2','${CLINIC_ID}','Paciente 2','pat2@x.com','222',true, now())`,
      ),
    );
  });

  describe('Cenário: ensureLink é idempotente', () => {
    it('Dado o mesmo par profissional-paciente, Quando ensureLink 2x, Então não duplica nem lança', async () => {
      await repo.ensureLink('prof-1', 'pat-1');
      await expect(repo.ensureLink('prof-1', 'pat-1')).resolves.not.toThrow();

      const rows = await db.execute(
        sql.raw(
          `SELECT count(*)::int AS c FROM "professional_patient_links" WHERE professional_id = 'prof-1' AND patient_id = 'pat-1'`,
        ),
      );
      expect(Number((rows.rows[0] as { c: number }).c)).toBe(1);
    });
  });

  describe('Cenário: hasLink', () => {
    it('Dado vínculo existente, Quando hasLink, Então true', async () => {
      expect(await repo.hasLink('prof-1', 'pat-1')).toBe(true);
    });

    it('Dado nenhum vínculo, Quando hasLink, Então false', async () => {
      expect(await repo.hasLink('prof-1', 'pat-2')).toBe(false);
    });
  });

  describe('Cenário: findLinkedPatientIds escopado por profissional e clínica', () => {
    it('Dado vínculos de um profissional, Quando findLinkedPatientIds, Então retorna só os pacientes vinculados a ele', async () => {
      await repo.ensureLink('prof-1', 'pat-2');

      const ids = await repo.findLinkedPatientIds('prof-1');

      expect(ids.sort()).toEqual(['pat-1', 'pat-2']);
    });

    it('Dado repositório de outra clínica, Quando findLinkedPatientIds do mesmo professionalId, Então lista vazia (isolamento por empresa)', async () => {
      const otherClinicRepo = new DrizzleProfessionalPatientLinkRepository(
        appDb,
        CLINIC_OTHER_ID,
      );

      const ids = await otherClinicRepo.findLinkedPatientIds('prof-1');

      expect(ids).toEqual([]);
    });
  });

  describe('Cenário: papel de sistema não cria vínculo', () => {
    it('Dado repositório com clinicId nulo, Quando ensureLink, Então lança erro', async () => {
      const systemRepo = new DrizzleProfessionalPatientLinkRepository(
        appDb,
        null,
      );

      await expect(systemRepo.ensureLink('prof-1', 'pat-1')).rejects.toThrow();
    });
  });
});

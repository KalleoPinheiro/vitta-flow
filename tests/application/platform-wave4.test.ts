import { beforeEach, describe, expect, it } from 'vitest';
import { ConditionPhoto } from '@/domain/clinical/condition-photo';
import {
  ConsentRecord,
  hashConsentText,
} from '@/domain/consent/consent-record';
import { ValidationError } from '@/domain/shared/errors';
import {
  InMemoryConditionPhotoRepository,
  InMemoryConsentRecordRepository,
} from '@/infrastructure/persistence/in-memory/in-memory-clinical-repositories';

describe('O4.1: Consentimento digital', () => {
  let repo: InMemoryConsentRecordRepository;

  beforeEach(() => {
    repo = new InMemoryConsentRecordRepository();
  });

  it('Dado aceite, Quando gravar, Então registra hash do texto exato + IP', async () => {
    const record = ConsentRecord.create({
      patientId: 'p1',
      consentText: 'TERMO v1',
      textVersion: 'v1',
      ipAddress: '10.0.0.1',
    });
    await repo.save(record);

    const stored = (await repo.findByPatientId('p1'))[0];
    expect(stored.textHash).toBe(hashConsentText('TERMO v1'));
    expect(stored.ipAddress).toBe('10.0.0.1');
    expect(stored.covers('TERMO v1')).toBe(true);
  });

  it('Dado texto do termo alterado, Quando verificar cobertura, Então aceite antigo não vale', () => {
    const record = ConsentRecord.create({
      patientId: 'p1',
      consentText: 'TERMO v1',
      textVersion: 'v1',
    });
    expect(record.covers('TERMO v2 — texto atualizado')).toBe(false);
  });

  it('Dado paciente ou texto vazio, Quando criar, Então ValidationError', () => {
    expect(() =>
      ConsentRecord.create({
        patientId: ' ',
        consentText: 'x',
        textVersion: 'v1',
      }),
    ).toThrow(ValidationError);
    expect(() =>
      ConsentRecord.create({
        patientId: 'p1',
        consentText: '  ',
        textVersion: 'v1',
      }),
    ).toThrow(ValidationError);
  });
});

describe('O4.2: Monitoramento remoto (foto do paciente + triagem)', () => {
  const JPEG = { contentType: 'image/jpeg' as const, sizeBytes: 100 };

  it('Dado envio do paciente, Quando criar, Então nasce pendente de triagem com nota', () => {
    const photo = ConditionPhoto.create({
      conditionId: 'c1',
      ...JPEG,
      origin: 'patient',
      patientNote: '  vazou de novo  ',
    });

    expect(photo.origin).toBe('patient');
    expect(photo.triageStatus).toBe('pending');
    expect(photo.patientNote).toBe('vazou de novo');
  });

  it('Dado foto da equipe, Quando criar, Então não entra na fila de triagem', () => {
    const photo = ConditionPhoto.create({ conditionId: 'c1', ...JPEG });
    expect(photo.origin).toBe('staff');
    expect(photo.triageStatus).toBeNull();
  });

  it('Dado triagem, Quando avaliar/escalar, Então sai da fila; foto de staff não triagem', async () => {
    const repo = new InMemoryConditionPhotoRepository();
    const fromPatient = ConditionPhoto.create({
      conditionId: 'c1',
      ...JPEG,
      origin: 'patient',
    });
    await repo.save(fromPatient);
    expect(await repo.findPendingTriage()).toHaveLength(1);

    await repo.save(fromPatient.withTriage('escalated'));
    expect(await repo.findPendingTriage()).toHaveLength(0);

    const fromStaff = ConditionPhoto.create({ conditionId: 'c1', ...JPEG });
    expect(() => fromStaff.withTriage('reviewed')).toThrow(ValidationError);
  });
});

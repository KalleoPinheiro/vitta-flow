import { beforeEach, describe, expect, it } from 'vitest';
import { CreateSupply } from '@/application/inventory/create-supply';
import {
  DispenseProcedureKit,
  KIT_REASON,
} from '@/application/inventory/dispense-procedure-kit';
import { RegisterStockMovement } from '@/application/inventory/register-stock-movement';
import { Procedure } from '@/domain/catalog/procedure';
import { ConditionAssessment } from '@/domain/clinical/condition-assessment';
import { FollowUp } from '@/domain/followup/follow-up';
import {
  InvalidStatusTransitionError,
  ValidationError,
} from '@/domain/shared/errors';
import { InMemoryProcedureKitRepository } from '@/infrastructure/persistence/in-memory/in-memory-foundation-repositories';
import {
  InMemoryStockMovementRepository,
  InMemorySupplyRepository,
} from '@/infrastructure/persistence/in-memory/in-memory-inventory-repositories';

const baseAssessment = { conditionId: 'cond-1' };

describe('Feature O2.1: PUSH Score 3.0', () => {
  it('Dado área 2cm², exsudato moderado e granulação, Quando calcular, Então PUSH = 4+2+2 = 8', () => {
    // 50mm × 40mm = 2000mm² = 20cm²? Não: 2000mm² = 20cm²... usamos 10×20mm = 200mm² = 2cm²
    const assessment = ConditionAssessment.create({
      ...baseAssessment,
      lengthMm: 10,
      widthMm: 20,
      exudate: 'moderate',
      tissueType: 'granulation',
    });
    expect(assessment.pushScore).toBe(4 + 2 + 2);
  });

  it('Dado ferida fechada sem exsudato, Quando calcular, Então PUSH = 0', () => {
    const assessment = ConditionAssessment.create({
      ...baseAssessment,
      lengthMm: 0,
      widthMm: 0,
      exudate: 'none',
      tissueType: 'closed',
    });
    expect(assessment.pushScore).toBe(0);
  });

  it('Dado área > 24cm² com necrose e exsudato alto, Quando calcular, Então PUSH = 17 (teto)', () => {
    const assessment = ConditionAssessment.create({
      ...baseAssessment,
      lengthMm: 60,
      widthMm: 50, // 3000mm² = 30cm²
      exudate: 'high',
      tissueType: 'necrotic',
    });
    expect(assessment.pushScore).toBe(17);
  });

  it('Dado componente ausente ou tecido legado em texto livre, Quando calcular, Então null', () => {
    const semMedida = ConditionAssessment.create({
      ...baseAssessment,
      exudate: 'low',
      tissueType: 'granulation',
    });
    expect(semMedida.pushScore).toBeNull();

    const legado = ConditionAssessment.create({
      ...baseAssessment,
      lengthMm: 10,
      widthMm: 10,
      exudate: 'low',
      tissueType: 'granulação com esfacelo', // texto livre pré-O2.1
    });
    expect(legado.pushScore).toBeNull();
  });
});

describe('Feature O2.2: Escala DET e complicações canônicas', () => {
  it('Dado os 3 domínios preenchidos, Quando calcular, Então DET = soma (0–15)', () => {
    const assessment = ConditionAssessment.create({
      ...baseAssessment,
      detDiscolorationArea: 2,
      detDiscolorationSeverity: 1,
      detErosionArea: 1,
      detErosionSeverity: 1,
      detOvergrowthArea: 0,
      detOvergrowthSeverity: 0,
    });
    expect(assessment.detScore).toBe(5);
  });

  it('Dado domínio incompleto, Quando calcular, Então DET = null', () => {
    const assessment = ConditionAssessment.create({
      ...baseAssessment,
      detDiscolorationArea: 2,
      detDiscolorationSeverity: 1,
    });
    expect(assessment.detScore).toBeNull();
  });

  it('Dado área fora de 0–3, Quando criar, Então ValidationError', () => {
    expect(() =>
      ConditionAssessment.create({ ...baseAssessment, detErosionArea: 4 }),
    ).toThrow(ValidationError);
  });

  it('Dado complicações canônicas válidas, Quando criar, Então lista tipada', () => {
    const assessment = ConditionAssessment.create({
      ...baseAssessment,
      complicationCodes: 'dermatitis, hernia',
    });
    expect(assessment.complicationCodes).toEqual(['dermatitis', 'hernia']);
  });

  it('Dado código de complicação inválido, Quando criar, Então ValidationError', () => {
    expect(() =>
      ConditionAssessment.create({
        ...baseAssessment,
        complicationCodes: 'dermatite-x',
      }),
    ).toThrow(ValidationError);
  });
});

describe('Feature O2.3: Recall de 1 clique (follow-up scheduled)', () => {
  const makeFollowUp = () =>
    FollowUp.create({
      patientId: 'p1',
      appointmentId: null,
      dueDate: new Date('2026-08-01T00:00:00Z'),
      reason: 'Retorno: Curativo',
    });

  it('Dado follow-up pendente, Quando agendar, Então vira scheduled e sai da pendência', () => {
    const scheduled = makeFollowUp().markScheduled();
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.isOverdue(new Date('2026-09-01T00:00:00Z'))).toBe(false);
  });

  it('Dado follow-up scheduled, Quando concluir, Então done; re-agendar é erro', () => {
    const scheduled = makeFollowUp().markScheduled();
    expect(scheduled.markDone().status).toBe('done');
    expect(() => scheduled.markScheduled()).toThrow(
      InvalidStatusTransitionError,
    );
  });
});

describe('Feature O2.4: Kit de insumos por procedimento', () => {
  let kitRepo: InMemoryProcedureKitRepository;
  let supplyRepo: InMemorySupplyRepository;
  let movementRepo: InMemoryStockMovementRepository;
  let procedure: Procedure;
  let bolsaId: string;
  let placaId: string;

  beforeEach(async () => {
    kitRepo = new InMemoryProcedureKitRepository();
    supplyRepo = new InMemorySupplyRepository();
    movementRepo = new InMemoryStockMovementRepository();
    procedure = Procedure.create({
      name: 'Troca de bolsa',
      priceCents: 25000,
      durationMinutes: 60,
    });

    const create = new CreateSupply(supplyRepo);
    const register = new RegisterStockMovement(supplyRepo, movementRepo);
    const bolsa = await create.execute({
      name: 'Bolsa',
      unit: 'un',
      minQty: 2,
      priceCents: 4000,
    });
    const placa = await create.execute({
      name: 'Placa',
      unit: 'un',
      minQty: 2,
      priceCents: 6000,
    });
    bolsaId = bolsa.id;
    placaId = placa.id;
    await register.execute({
      supplyId: bolsaId,
      type: 'in',
      quantity: 10,
      reason: 'Compra',
    });
    await register.execute({
      supplyId: placaId,
      type: 'in',
      quantity: 1,
      reason: 'Compra',
    });
    await kitRepo.setKit(procedure.id, [
      { supplyId: bolsaId, quantity: 2 },
      { supplyId: placaId, quantity: 3 },
    ]);
  });

  const dispense = () =>
    new DispenseProcedureKit(
      kitRepo,
      supplyRepo,
      movementRepo,
      new RegisterStockMovement(supplyRepo, movementRepo),
    ).execute({ appointmentId: 'appt-1', procedureId: procedure.id });

  it('Dado kit com estoque parcial, Quando dispensar, Então baixa o possível e avisa o resto', async () => {
    const result = await dispense();

    expect(result.dispensed).toBe(1); // bolsa ok
    expect(result.warnings).toHaveLength(1); // placa: precisa 3, há 1
    expect(result.warnings[0]).toContain('Placa');
    expect((await supplyRepo.findById(bolsaId))?.stockQty).toBe(8);
    expect((await supplyRepo.findById(placaId))?.stockQty).toBe(1); // intacto (tudo-ou-nada por item)
  });

  it('Dado kit já dispensado, Quando dispensar de novo (conclusão reparadora), Então não duplica', async () => {
    await dispense();
    const second = await dispense();

    expect(second.skipped).toBe(true);
    expect((await supplyRepo.findById(bolsaId))?.stockQty).toBe(8);
  });

  it('Dado movimento do kit, Quando inspecionar, Então saída vinculada à consulta com motivo padrão', async () => {
    await dispense();

    const movements = await movementRepo.findByAppointmentId('appt-1');
    expect(movements).toHaveLength(1);
    expect(movements[0].reason).toBe(KIT_REASON);
    expect(movements[0].unitPriceCents).toBe(4000);
  });

  it('Dado item duplicado no kit, Quando salvar, Então ValidationError', async () => {
    await expect(
      kitRepo.setKit(procedure.id, [
        { supplyId: bolsaId, quantity: 1 },
        { supplyId: bolsaId, quantity: 2 },
      ]),
    ).rejects.toThrow(ValidationError);
  });
});

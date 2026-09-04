import { describe, expect, it } from 'vitest';
import { FollowUp } from '@/domain/followup/follow-up';
import { StockMovement } from '@/domain/inventory/stock-movement';
import { Supply } from '@/domain/inventory/supply';
import {
  InsufficientStockError,
  InvalidStatusTransitionError,
  ValidationError,
} from '@/domain/shared/errors';

describe('Feature: Insumo com controle de estoque', () => {
  const bolsa = () =>
    Supply.create({
      name: 'Bolsa colostomia 1 peça 60mm',
      unit: 'un',
      minQty: 10,
      priceCents: 3500,
    });

  it('Dado dados válidos, Quando criar, Então insumo ativo com estoque zero', () => {
    const supply = bolsa();

    expect(supply.stockQty).toBe(0);
    expect(supply.isActive).toBe(true);
    expect(supply.isLowStock).toBe(true);
  });

  it('Dado nome vazio ou mínimo negativo, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      Supply.create({ name: ' ', unit: 'un', minQty: 1, priceCents: 100 }),
    ).toThrow(ValidationError);
    expect(() =>
      Supply.create({ name: 'X', unit: 'un', minQty: -1, priceCents: 100 }),
    ).toThrow(ValidationError);
  });

  it('Dado entrada de estoque, Quando registrar, Então quantidade aumenta imutavelmente', () => {
    const supply = bolsa();

    const stocked = supply.registerEntry(50);

    expect(stocked.stockQty).toBe(50);
    expect(stocked.isLowStock).toBe(false);
    expect(supply.stockQty).toBe(0);
  });

  it('Dado saída maior que estoque, Quando registrar, Então lança InsufficientStockError', () => {
    const supply = bolsa().registerEntry(5);

    expect(() => supply.registerExit(6)).toThrow(InsufficientStockError);
    expect(supply.registerExit(5).stockQty).toBe(0);
  });

  it('Dado quantidade zero ou negativa, Quando movimentar, Então lança ValidationError', () => {
    const supply = bolsa();

    expect(() => supply.registerEntry(0)).toThrow(ValidationError);
    expect(() => supply.registerExit(-2)).toThrow(ValidationError);
  });

  it('Dado estoque igual ao mínimo, Quando verificar isLowStock, Então true', () => {
    expect(bolsa().registerEntry(10).isLowStock).toBe(true);
    expect(bolsa().registerEntry(11).isLowStock).toBe(false);
  });

  it('Dado insumo, Quando desativar, Então isActive false', () => {
    expect(bolsa().deactivate().isActive).toBe(false);
  });

  it('Dado insumo recém-criado sem mínimo configurado (minQty 0), Quando verificar isLowStock, Então false (MAT-02)', () => {
    const supply = Supply.create({
      name: 'Insumo novo',
      unit: 'un',
      minQty: 0,
      priceCents: 100,
    });

    expect(supply.isLowStock).toBe(false);
  });

  it('Dado insumo zerado com mínimo configurado, Quando verificar isOutOfStock, Então true e mais grave que isLowStock isolado (MAT-01)', () => {
    const supply = bolsa();

    expect(supply.isOutOfStock).toBe(true);
    expect(supply.registerEntry(5).isOutOfStock).toBe(false);
  });
});

describe('Feature: Movimentação de estoque auditável', () => {
  it('Dado movimentação válida, Quando criar, Então registra tipo, quantidade e motivo', () => {
    const movement = StockMovement.create({
      supplyId: 's1',
      type: 'out',
      quantity: 2,
      reason: 'Uso em atendimento',
    });

    expect(movement.type).toBe('out');
    expect(movement.quantity).toBe(2);
    expect(movement.createdAt).toBeInstanceOf(Date);
  });

  it('Dado quantidade inválida, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      StockMovement.create({
        supplyId: 's1',
        type: 'in',
        quantity: 0,
        reason: 'x',
      }),
    ).toThrow(ValidationError);
  });
});

describe('Feature: Retorno programado (follow-up)', () => {
  const followUp = () =>
    FollowUp.create({
      patientId: 'p1',
      appointmentId: 'a1',
      dueDate: new Date('2026-08-15T12:00:00Z'),
      reason: 'Retorno: troca de bolsa',
    });

  it('Dado dados válidos, Quando criar, Então pendente', () => {
    const created = followUp();

    expect(created.status).toBe('pending');
    expect(created.dueDate).toEqual(new Date('2026-08-15T12:00:00Z'));
  });

  it('Dado retorno pendente vencido, Quando verificar isOverdue, Então true', () => {
    const created = followUp();

    expect(created.isOverdue(new Date('2026-08-16T00:00:00Z'))).toBe(true);
    expect(created.isOverdue(new Date('2026-08-10T00:00:00Z'))).toBe(false);
  });

  it('Dado pendente, Quando concluir ou cancelar, Então muda status; repetir lança erro', () => {
    const done = followUp().markDone();
    const cancelled = followUp().cancel();

    expect(done.status).toBe('done');
    expect(cancelled.status).toBe('cancelled');
    expect(() => done.markDone()).toThrow(InvalidStatusTransitionError);
    expect(() => cancelled.markDone()).toThrow(InvalidStatusTransitionError);
    expect(done.isOverdue(new Date('2027-01-01'))).toBe(false);
  });

  it('Dado motivo vazio, Quando criar, Então lança ValidationError', () => {
    expect(() =>
      FollowUp.create({ patientId: 'p1', dueDate: new Date(), reason: ' ' }),
    ).toThrow(ValidationError);
  });
});

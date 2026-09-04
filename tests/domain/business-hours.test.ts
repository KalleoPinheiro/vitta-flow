import { describe, expect, it } from 'vitest';
import {
  assertWithinBusinessHours,
  BUSINESS_HOURS,
} from '@/domain/scheduling/business-hours';
import { ValidationError } from '@/domain/shared/errors';
import { TimeSlot } from '@/domain/shared/time-slot';

// Datas construídas em horário local — 2026-07-20 é segunda-feira.
const localSlot = (
  day: number,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
) =>
  TimeSlot.create(
    new Date(2026, 6, day, startHour, startMinute),
    new Date(2026, 6, day, endHour, endMinute),
  );

describe('Feature: Atendimento somente em horário comercial', () => {
  describe('Cenário: horários válidos', () => {
    it('Dado slot dentro do expediente em dia útil, Quando validar, Então não lança erro', () => {
      expect(() =>
        assertWithinBusinessHours(localSlot(20, 9, 0, 10, 0)),
      ).not.toThrow();
    });

    it('Dado slot exatamente nos limites (abertura e fechamento), Quando validar, Então não lança erro', () => {
      expect(() =>
        assertWithinBusinessHours(
          localSlot(20, BUSINESS_HOURS.startHour, 0, BUSINESS_HOURS.endHour, 0),
        ),
      ).not.toThrow();
    });
  });

  describe('Cenário: horários inválidos', () => {
    it('Dado slot antes da abertura, Quando validar, Então lança ValidationError', () => {
      expect(() =>
        assertWithinBusinessHours(localSlot(20, 7, 0, 8, 0)),
      ).toThrow(ValidationError);
    });

    it('Dado slot que ultrapassa o fechamento, Quando validar, Então lança ValidationError', () => {
      expect(() =>
        assertWithinBusinessHours(
          localSlot(
            20,
            BUSINESS_HOURS.endHour - 1,
            30,
            BUSINESS_HOURS.endHour,
            30,
          ),
        ),
      ).toThrow(ValidationError);
    });

    it('Dado slot no sábado, Quando validar, Então lança ValidationError', () => {
      // 2026-07-25 é sábado
      expect(() =>
        assertWithinBusinessHours(localSlot(25, 9, 0, 10, 0)),
      ).toThrow(ValidationError);
    });

    it('Dado slot no domingo, Quando validar, Então lança ValidationError', () => {
      // 2026-07-26 é domingo
      expect(() =>
        assertWithinBusinessHours(localSlot(26, 9, 0, 10, 0)),
      ).toThrow(ValidationError);
    });

    it('Dado slot atravessando dias, Quando validar, Então lança ValidationError', () => {
      const slot = TimeSlot.create(
        new Date(2026, 6, 20, 17, 0),
        new Date(2026, 6, 21, 9, 0),
      );

      expect(() => assertWithinBusinessHours(slot)).toThrow(ValidationError);
    });
  });
});

describe('Feature: Expansão de TimeSlot para intervalo mínimo', () => {
  it('Dado slot e margem de 15min, Quando expandir, Então início e fim deslocados', () => {
    const slot = TimeSlot.create(
      new Date('2026-07-20T12:00:00Z'),
      new Date('2026-07-20T13:00:00Z'),
    );

    const expanded = slot.expand(15);

    expect(expanded.start).toEqual(new Date('2026-07-20T11:45:00Z'));
    expect(expanded.end).toEqual(new Date('2026-07-20T13:15:00Z'));
  });

  it('Dado slots com folga menor que a margem, Quando comparar expandido, Então sobrepõe', () => {
    const first = TimeSlot.create(
      new Date('2026-07-20T12:00:00Z'),
      new Date('2026-07-20T13:00:00Z'),
    );
    const adjacent = TimeSlot.create(
      new Date('2026-07-20T13:10:00Z'),
      new Date('2026-07-20T14:00:00Z'),
    );
    const farEnough = TimeSlot.create(
      new Date('2026-07-20T13:15:00Z'),
      new Date('2026-07-20T14:00:00Z'),
    );

    expect(adjacent.expand(15).overlaps(first)).toBe(true);
    expect(farEnough.expand(15).overlaps(first)).toBe(false);
  });
});

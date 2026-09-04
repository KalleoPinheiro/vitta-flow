import { describe, expect, it } from 'vitest';
import { InvalidTimeSlotError } from '@/domain/shared/errors';
import { TimeSlot } from '@/domain/shared/time-slot';

const at = (iso: string) => new Date(iso);

describe('Feature: Janela de horário (TimeSlot)', () => {
  describe('Cenário: criar janela válida', () => {
    it('Dado início antes do fim, Quando criar, Então retorna TimeSlot com duração correta', () => {
      const slot = TimeSlot.create(
        at('2026-07-20T09:00:00Z'),
        at('2026-07-20T09:45:00Z'),
      );

      expect(slot.durationMinutes).toBe(45);
    });

    it('Dado início igual ou depois do fim, Quando criar, Então lança InvalidTimeSlotError', () => {
      const start = at('2026-07-20T10:00:00Z');

      expect(() => TimeSlot.create(start, start)).toThrow(InvalidTimeSlotError);
      expect(() => TimeSlot.create(start, at('2026-07-20T09:00:00Z'))).toThrow(
        InvalidTimeSlotError,
      );
    });

    it('Dado data inválida, Quando criar, Então lança InvalidTimeSlotError', () => {
      expect(() =>
        TimeSlot.create(new Date('nope'), at('2026-07-20T10:00:00Z')),
      ).toThrow(InvalidTimeSlotError);
    });
  });

  describe('Cenário: detectar sobreposição de horários', () => {
    const base = TimeSlot.create(
      at('2026-07-20T09:00:00Z'),
      at('2026-07-20T10:00:00Z'),
    );

    it('Dado slot que cruza o início, Quando verificar overlaps, Então retorna true', () => {
      const other = TimeSlot.create(
        at('2026-07-20T08:30:00Z'),
        at('2026-07-20T09:30:00Z'),
      );

      expect(base.overlaps(other)).toBe(true);
    });

    it('Dado slot contido dentro do outro, Quando verificar overlaps, Então retorna true', () => {
      const other = TimeSlot.create(
        at('2026-07-20T09:15:00Z'),
        at('2026-07-20T09:30:00Z'),
      );

      expect(base.overlaps(other)).toBe(true);
      expect(other.overlaps(base)).toBe(true);
    });

    it('Dado slots adjacentes (fim = início), Quando verificar overlaps, Então retorna false', () => {
      const other = TimeSlot.create(
        at('2026-07-20T10:00:00Z'),
        at('2026-07-20T11:00:00Z'),
      );

      expect(base.overlaps(other)).toBe(false);
    });

    it('Dado slots totalmente separados, Quando verificar overlaps, Então retorna false', () => {
      const other = TimeSlot.create(
        at('2026-07-20T14:00:00Z'),
        at('2026-07-20T15:00:00Z'),
      );

      expect(base.overlaps(other)).toBe(false);
    });
  });
});

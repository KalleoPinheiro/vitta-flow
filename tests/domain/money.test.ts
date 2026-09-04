import { describe, expect, it } from 'vitest';
import { InvalidMoneyError } from '@/domain/shared/errors';
import { Money } from '@/domain/shared/money';

describe('Feature: Valor monetário (Money)', () => {
  describe('Cenário: criar valor a partir de centavos', () => {
    it('Dado 15000 centavos, Quando criar Money, Então representa R$ 150,00', () => {
      const money = Money.fromCents(15000);

      expect(money.cents).toBe(15000);
      expect(money.toReais()).toBe(150);
    });

    it('Dado valor negativo, Quando criar Money, Então lança InvalidMoneyError', () => {
      expect(() => Money.fromCents(-1)).toThrow(InvalidMoneyError);
    });

    it('Dado valor não inteiro, Quando criar Money, Então lança InvalidMoneyError', () => {
      expect(() => Money.fromCents(10.5)).toThrow(InvalidMoneyError);
    });
  });

  describe('Cenário: criar valor a partir de reais', () => {
    it('Dado 150.5 reais, Quando criar Money, Então tem 15050 centavos', () => {
      expect(Money.fromReais(150.5).cents).toBe(15050);
    });

    it('Dado dízima de ponto flutuante, Quando criar Money, Então arredonda corretamente', () => {
      expect(Money.fromReais(0.1 + 0.2).cents).toBe(30);
    });
  });

  describe('Cenário: operações aritméticas imutáveis', () => {
    it('Dado dois valores, Quando somar, Então retorna novo Money com a soma', () => {
      const a = Money.fromCents(1000);
      const b = Money.fromCents(500);

      const result = a.add(b);

      expect(result.cents).toBe(1500);
      expect(a.cents).toBe(1000);
    });

    it('Dado dois valores, Quando subtrair resultando negativo, Então lança InvalidMoneyError', () => {
      const a = Money.fromCents(100);
      const b = Money.fromCents(500);

      expect(() => a.subtract(b)).toThrow(InvalidMoneyError);
    });
  });

  describe('Cenário: formatação e igualdade', () => {
    it('Dado R$ 1.234,56, Quando formatar, Então usa formato BRL', () => {
      const formatted = Money.fromCents(123456).format();

      expect(formatted).toContain('1.234,56');
    });

    it('Dado valores iguais, Quando comparar equals, Então retorna true', () => {
      expect(Money.fromCents(100).equals(Money.fromCents(100))).toBe(true);
      expect(Money.fromCents(100).equals(Money.fromCents(101))).toBe(false);
    });

    it('Dado Money zero, Quando verificar isZero, Então retorna true', () => {
      expect(Money.zero().isZero()).toBe(true);
      expect(Money.fromCents(1).isZero()).toBe(false);
    });
  });
});

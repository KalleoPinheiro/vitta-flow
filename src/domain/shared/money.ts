import { InvalidMoneyError } from "./errors";

const CENTS_PER_REAL = 100;

export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new InvalidMoneyError(`Valor em centavos deve ser inteiro: ${cents}`);
    }
    if (cents < 0) {
      throw new InvalidMoneyError(`Valor monetário não pode ser negativo: ${cents}`);
    }
    return new Money(cents);
  }

  static fromReais(reais: number): Money {
    return Money.fromCents(Math.round(reais * CENTS_PER_REAL));
  }

  static zero(): Money {
    return new Money(0);
  }

  toReais(): number {
    return this.cents / CENTS_PER_REAL;
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return Money.fromCents(this.cents - other.cents);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  format(): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(this.toReais());
  }
}

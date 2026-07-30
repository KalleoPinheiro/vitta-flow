import { describe, it, expect } from "vitest";
import { SupplyBatch } from "@/domain/inventory/supply-batch";
import { Supply } from "@/domain/inventory/supply";
import { StockMovement } from "@/domain/inventory/stock-movement";
import { ValidationError } from "@/domain/shared/errors";

const validBatchProps = {
  supplyId: "supply-1",
  quantity: 20,
};

describe("Feature: Lote de entrada de insumo (SupplyBatch)", () => {
  describe("Cenário: criar lote válido", () => {
    it("Dado dados válidos, Quando criar, Então lote com remaining igual à quantidade", () => {
      const batch = SupplyBatch.create(validBatchProps);

      expect(batch.id).toBeTruthy();
      expect(batch.remaining).toBe(20);
      expect(batch.quantity).toBe(20);
      expect(batch.label).toBeNull();
      expect(batch.expiresAt).toBeNull();
      expect(batch.createdAt).toBeInstanceOf(Date);
    });

    it("Dado label e expiresAt, Quando criar, Então ambos preservados", () => {
      const expiresAt = new Date("2027-01-01T00:00:00Z");
      const batch = SupplyBatch.create({ ...validBatchProps, label: "  Lote A  ", expiresAt });

      expect(batch.label).toBe("Lote A");
      expect(batch.expiresAt).toEqual(expiresAt);
    });
  });

  describe("Cenário: rejeitar quantidade inválida", () => {
    it("Dado quantidade não inteira, Quando criar, Então lança ValidationError", () => {
      expect(() => SupplyBatch.create({ ...validBatchProps, quantity: 1.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado quantidade zero ou negativa, Quando criar, Então lança ValidationError", () => {
      expect(() => SupplyBatch.create({ ...validBatchProps, quantity: 0 })).toThrow(
        ValidationError,
      );
      expect(() => SupplyBatch.create({ ...validBatchProps, quantity: -5 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("Cenário: consumir do lote", () => {
    it("Dado quantidade menor que o saldo, Quando consumir, Então remaining diminui e leftover zero", () => {
      const batch = SupplyBatch.create(validBatchProps);

      const { batch: updated, leftover } = batch.consume(5);

      expect(updated.remaining).toBe(15);
      expect(leftover).toBe(0);
      expect(batch.remaining).toBe(20);
    });

    it("Dado quantidade maior que o saldo, Quando consumir, Então remaining zera e leftover é o excedente", () => {
      const batch = SupplyBatch.create(validBatchProps);

      const { batch: updated, leftover } = batch.consume(25);

      expect(updated.remaining).toBe(0);
      expect(leftover).toBe(5);
    });

    it("Dado quantidade a consumir inválida, Quando consumir, Então lança ValidationError", () => {
      const batch = SupplyBatch.create(validBatchProps);

      expect(() => batch.consume(0)).toThrow(ValidationError);
      expect(() => batch.consume(-1)).toThrow(ValidationError);
      expect(() => batch.consume(1.5)).toThrow(ValidationError);
    });
  });

  describe("Cenário: verificar vencimento (isExpired)", () => {
    it("Dado lote sem validade, Quando verificar, Então nunca expira", () => {
      const batch = SupplyBatch.create(validBatchProps);

      expect(batch.isExpired()).toBe(false);
    });

    it("Dado validade no passado, Quando verificar, Então isExpired true", () => {
      const batch = SupplyBatch.create({
        ...validBatchProps,
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      });

      expect(batch.isExpired(new Date("2026-02-01T00:00:00Z"))).toBe(true);
    });

    it("Dado validade exatamente igual a agora, Quando verificar, Então isExpired true", () => {
      const now = new Date("2026-02-01T00:00:00Z");
      const batch = SupplyBatch.create({ ...validBatchProps, expiresAt: now });

      expect(batch.isExpired(now)).toBe(true);
    });

    it("Dado validade no futuro, Quando verificar, Então isExpired false", () => {
      const batch = SupplyBatch.create({
        ...validBatchProps,
        expiresAt: new Date("2027-01-01T00:00:00Z"),
      });

      expect(batch.isExpired(new Date("2026-02-01T00:00:00Z"))).toBe(false);
    });
  });

  describe("Cenário: verificar vencimento próximo (expiresWithinDays)", () => {
    it("Dado lote sem validade, Quando verificar, Então retorna false", () => {
      const batch = SupplyBatch.create(validBatchProps);

      expect(batch.expiresWithinDays(30)).toBe(false);
    });

    it("Dado validade dentro do prazo, Quando verificar, Então retorna true", () => {
      const now = new Date("2026-02-01T00:00:00Z");
      const batch = SupplyBatch.create({
        ...validBatchProps,
        expiresAt: new Date("2026-02-10T00:00:00Z"),
      });

      expect(batch.expiresWithinDays(30, now)).toBe(true);
    });

    it("Dado validade fora do prazo, Quando verificar, Então retorna false", () => {
      const now = new Date("2026-02-01T00:00:00Z");
      const batch = SupplyBatch.create({
        ...validBatchProps,
        expiresAt: new Date("2026-06-01T00:00:00Z"),
      });

      expect(batch.expiresWithinDays(30, now)).toBe(false);
    });
  });

  describe("Cenário: reconstituir lote da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém id e remaining", () => {
      const createdAt = new Date("2026-01-01T00:00:00Z");
      const batch = SupplyBatch.restore({
        id: "batch-1",
        supplyId: "supply-1",
        quantity: 20,
        remaining: 12,
        label: null,
        expiresAt: null,
        createdAt,
      });

      expect(batch.id).toBe("batch-1");
      expect(batch.remaining).toBe(12);
      expect(batch.createdAt).toEqual(createdAt);
    });
  });
});

describe("Feature: Insumo — validações e atualização adicionais", () => {
  const bolsa = () => Supply.create({ name: "Placa protetora", unit: "un", minQty: 5, priceCents: 4200 });

  it("Dado unidade vazia, Quando criar, Então lança ValidationError", () => {
    expect(() => Supply.create({ name: "X", unit: " ", minQty: 1, priceCents: 100 })).toThrow(
      ValidationError,
    );
  });

  it("Dado preço não inteiro ou negativo, Quando criar, Então lança ValidationError", () => {
    expect(() => Supply.create({ name: "X", unit: "un", minQty: 1, priceCents: 10.5 })).toThrow(
      ValidationError,
    );
    expect(() => Supply.create({ name: "X", unit: "un", minQty: 1, priceCents: -1 })).toThrow(
      ValidationError,
    );
  });

  it("Dado minQty não inteiro, Quando criar, Então lança ValidationError", () => {
    expect(() => Supply.create({ name: "X", unit: "un", minQty: 1.5, priceCents: 100 })).toThrow(
      ValidationError,
    );
  });

  it("Dado atualização parcial, Quando atualizar, Então mescla campos e mantém imutabilidade", () => {
    const supply = bolsa();

    const updated = supply.update({ name: "Placa protetora extra fina", priceCents: 4500 });

    expect(updated.name).toBe("Placa protetora extra fina");
    expect(updated.priceCents).toBe(4500);
    expect(updated.unit).toBe("un");
    expect(supply.name).toBe("Placa protetora");
  });

  it("Dado nenhuma mudança, Quando atualizar, Então mantém valores atuais", () => {
    const supply = bolsa();

    const updated = supply.update({});

    expect(updated.name).toBe(supply.name);
    expect(updated.unit).toBe(supply.unit);
    expect(updated.minQty).toBe(supply.minQty);
    expect(updated.priceCents).toBe(supply.priceCents);
  });

  it("Dado atualização inválida, Quando atualizar, Então lança ValidationError", () => {
    const supply = bolsa();

    expect(() => supply.update({ name: " " })).toThrow(ValidationError);
  });

  it("Dado reativação, Quando reativar insumo inativo, Então isActive true", () => {
    const supply = bolsa().deactivate();

    expect(supply.reactivate().isActive).toBe(true);
  });

  it("Dado saída exatamente igual ao estoque, Quando registrar, Então zera o estoque", () => {
    const supply = bolsa().registerEntry(10);

    expect(supply.registerExit(10).stockQty).toBe(0);
  });
});

describe("Feature: Movimentação de estoque — validações e custo adicionais", () => {
  it("Dado motivo vazio, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      StockMovement.create({ supplyId: "supply-1", type: "in", quantity: 1, reason: " " }),
    ).toThrow(ValidationError);
  });

  it("Dado unitPriceCents negativo, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      StockMovement.create({
        supplyId: "supply-1",
        type: "out",
        quantity: 1,
        reason: "Uso clínico",
        unitPriceCents: -1,
      }),
    ).toThrow(ValidationError);
  });

  it("Dado unitPriceCents informado, Quando criar, Então totalCostCents é calculado", () => {
    const movement = StockMovement.create({
      supplyId: "supply-1",
      type: "out",
      quantity: 3,
      reason: "Uso clínico",
      unitPriceCents: 500,
      appointmentId: "appt-1",
    });

    expect(movement.totalCostCents).toBe(1500);
    expect(movement.appointmentId).toBe("appt-1");
    expect(movement.unitPriceCents).toBe(500);
  });

  it("Dado unitPriceCents omitido, Quando criar, Então totalCostCents é nulo", () => {
    const movement = StockMovement.create({
      supplyId: "supply-1",
      type: "in",
      quantity: 3,
      reason: "Compra",
    });

    expect(movement.totalCostCents).toBeNull();
    expect(movement.unitPriceCents).toBeNull();
    expect(movement.appointmentId).toBeNull();
  });

  it("Dado state completo, Quando restore, Então mantém id e createdAt", () => {
    const createdAt = new Date("2026-03-05T00:00:00Z");
    const movement = StockMovement.restore({
      id: "mov-1",
      supplyId: "supply-1",
      type: "in",
      quantity: 10,
      reason: "Compra",
      appointmentId: null,
      unitPriceCents: null,
      createdAt,
    });

    expect(movement.id).toBe("mov-1");
    expect(movement.createdAt).toEqual(createdAt);
  });
});

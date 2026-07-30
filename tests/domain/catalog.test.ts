import { describe, it, expect } from "vitest";
import { Procedure } from "@/domain/catalog/procedure";
import { validateKitItems } from "@/domain/catalog/procedure-kit";
import { ValidationError } from "@/domain/shared/errors";

const validProps = {
  name: "Troca de bolsa de colostomia",
  priceCents: 25000,
  durationMinutes: 45,
};

describe("Feature: Procedimento do catálogo", () => {
  describe("Cenário: criar procedimento válido", () => {
    it("Dado dados válidos, Quando criar, Então procedimento ativo com id gerado", () => {
      const procedure = Procedure.create(validProps);

      expect(procedure.id).toBeTruthy();
      expect(procedure.name).toBe("Troca de bolsa de colostomia");
      expect(procedure.priceCents).toBe(25000);
      expect(procedure.durationMinutes).toBe(45);
      expect(procedure.isActive).toBe(true);
      expect(procedure.createdAt).toBeInstanceOf(Date);
    });

    it("Dado nome com espaços nas bordas, Quando criar, Então nome é normalizado", () => {
      const procedure = Procedure.create({ ...validProps, name: "  Avaliação de ferida  " });

      expect(procedure.name).toBe("Avaliação de ferida");
    });

    it("Dado duração no limite máximo (8h), Quando criar, Então aceita", () => {
      const procedure = Procedure.create({ ...validProps, durationMinutes: 8 * 60 });

      expect(procedure.durationMinutes).toBe(480);
    });

    it("Dado preço zero, Quando criar, Então aceita (procedimento gratuito)", () => {
      const procedure = Procedure.create({ ...validProps, priceCents: 0 });

      expect(procedure.priceCents).toBe(0);
    });
  });

  describe("Cenário: rejeitar dados inválidos", () => {
    it("Dado nome vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => Procedure.create({ ...validProps, name: "   " })).toThrow(ValidationError);
    });

    it("Dado preço não inteiro, Quando criar, Então lança ValidationError", () => {
      expect(() => Procedure.create({ ...validProps, priceCents: 10.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado preço negativo, Quando criar, Então lança ValidationError", () => {
      expect(() => Procedure.create({ ...validProps, priceCents: -1 })).toThrow(ValidationError);
    });

    it("Dado duração não inteira, Quando criar, Então lança ValidationError", () => {
      expect(() => Procedure.create({ ...validProps, durationMinutes: 30.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado duração zero ou negativa, Quando criar, Então lança ValidationError", () => {
      expect(() => Procedure.create({ ...validProps, durationMinutes: 0 })).toThrow(
        ValidationError,
      );
      expect(() => Procedure.create({ ...validProps, durationMinutes: -10 })).toThrow(
        ValidationError,
      );
    });

    it("Dado duração acima de 8 horas, Quando criar, Então lança ValidationError", () => {
      expect(() => Procedure.create({ ...validProps, durationMinutes: 481 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("Cenário: atualizar procedimento", () => {
    it("Dado atualização parcial de nome, Quando atualizar, Então mantém demais campos", () => {
      const procedure = Procedure.create(validProps);

      const updated = procedure.update({ name: "Nova avaliação" });

      expect(updated.name).toBe("Nova avaliação");
      expect(updated.priceCents).toBe(25000);
      expect(procedure.name).toBe("Troca de bolsa de colostomia");
    });

    it("Dado atualização de preço e duração, Quando atualizar, Então valores aplicados", () => {
      const procedure = Procedure.create(validProps);

      const updated = procedure.update({ priceCents: 30000, durationMinutes: 60 });

      expect(updated.priceCents).toBe(30000);
      expect(updated.durationMinutes).toBe(60);
    });

    it("Dado nenhuma mudança, Quando atualizar, Então mantém valores atuais", () => {
      const procedure = Procedure.create(validProps);

      const updated = procedure.update({});

      expect(updated.name).toBe(procedure.name);
      expect(updated.priceCents).toBe(procedure.priceCents);
      expect(updated.durationMinutes).toBe(procedure.durationMinutes);
    });

    it("Dado atualização inválida, Quando atualizar, Então lança ValidationError", () => {
      const procedure = Procedure.create(validProps);

      expect(() => procedure.update({ name: " " })).toThrow(ValidationError);
    });
  });

  describe("Cenário: desativar e reativar procedimento", () => {
    it("Dado procedimento ativo, Quando desativar, Então isActive false", () => {
      const procedure = Procedure.create(validProps);

      expect(procedure.deactivate().isActive).toBe(false);
      expect(procedure.isActive).toBe(true);
    });

    it("Dado procedimento inativo, Quando reativar, Então isActive true", () => {
      const procedure = Procedure.create(validProps).deactivate();

      expect(procedure.reactivate().isActive).toBe(true);
    });
  });

  describe("Cenário: reconstituir procedimento da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém id e datas", () => {
      const createdAt = new Date("2026-01-10T00:00:00Z");
      const procedure = Procedure.restore({
        id: "proc-1",
        name: "Curativo",
        priceCents: 10000,
        durationMinutes: 30,
        active: false,
        createdAt,
      });

      expect(procedure.id).toBe("proc-1");
      expect(procedure.isActive).toBe(false);
      expect(procedure.createdAt).toEqual(createdAt);
    });
  });
});

describe("Feature: Kit padrão de insumos do procedimento", () => {
  describe("Cenário: validar itens do kit", () => {
    it("Dado itens válidos e distintos, Quando validar, Então retorna a mesma lista", () => {
      const items = [
        { supplyId: "supply-1", quantity: 2 },
        { supplyId: "supply-2", quantity: 1 },
      ];

      expect(validateKitItems(items)).toEqual(items);
    });

    it("Dado lista vazia, Quando validar, Então retorna lista vazia", () => {
      expect(validateKitItems([])).toEqual([]);
    });
  });

  describe("Cenário: rejeitar itens inválidos", () => {
    it("Dado supplyId vazio, Quando validar, Então lança ValidationError", () => {
      expect(() => validateKitItems([{ supplyId: " ", quantity: 1 }])).toThrow(ValidationError);
    });

    it("Dado quantidade não inteira, Quando validar, Então lança ValidationError", () => {
      expect(() => validateKitItems([{ supplyId: "supply-1", quantity: 1.5 }])).toThrow(
        ValidationError,
      );
    });

    it("Dado quantidade zero ou negativa, Quando validar, Então lança ValidationError", () => {
      expect(() => validateKitItems([{ supplyId: "supply-1", quantity: 0 }])).toThrow(
        ValidationError,
      );
      expect(() => validateKitItems([{ supplyId: "supply-1", quantity: -1 }])).toThrow(
        ValidationError,
      );
    });

    it("Dado insumo repetido no kit, Quando validar, Então lança ValidationError", () => {
      const items = [
        { supplyId: "supply-1", quantity: 1 },
        { supplyId: "supply-1", quantity: 2 },
      ];

      expect(() => validateKitItems(items)).toThrow(ValidationError);
    });
  });
});

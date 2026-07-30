import { describe, it, expect } from "vitest";
import { Professional } from "@/domain/professional/professional";
import { ValidationError } from "@/domain/shared/errors";

const validProps = {
  fullName: "Enf. Beatriz Lima",
  registry: "COREN-SP 123456",
  commissionPct: 30,
};

describe("Feature: Profissional da equipe", () => {
  describe("Cenário: criar profissional válido", () => {
    it("Dado dados válidos, Quando criar, Então profissional ativo com id gerado", () => {
      const professional = Professional.create(validProps);

      expect(professional.id).toBeTruthy();
      expect(professional.fullName).toBe("Enf. Beatriz Lima");
      expect(professional.registry).toBe("COREN-SP 123456");
      expect(professional.commissionPct).toBe(30);
      expect(professional.isActive).toBe(true);
      expect(professional.createdAt).toBeInstanceOf(Date);
    });

    it("Dado nome com espaços nas bordas, Quando criar, Então nome é normalizado", () => {
      const professional = Professional.create({ fullName: "  Dr. João  " });

      expect(professional.fullName).toBe("Dr. João");
    });

    it("Dado registry omitido, Quando criar, Então registry é nulo", () => {
      const professional = Professional.create({ fullName: "Enf. Ana" });

      expect(professional.registry).toBeNull();
    });

    it("Dado commissionPct omitido, Quando criar, Então commissionPct é nulo", () => {
      const professional = Professional.create({ fullName: "Enf. Ana" });

      expect(professional.commissionPct).toBeNull();
    });

    it("Dado commissionPct null explícito, Quando criar, Então commissionPct é nulo", () => {
      const professional = Professional.create({ fullName: "Enf. Ana", commissionPct: null });

      expect(professional.commissionPct).toBeNull();
    });

    it("Dado commissionPct nos limites (0 e 100), Quando criar, Então aceita", () => {
      expect(Professional.create({ fullName: "Enf. Ana", commissionPct: 0 }).commissionPct).toBe(
        0,
      );
      expect(
        Professional.create({ fullName: "Enf. Ana", commissionPct: 100 }).commissionPct,
      ).toBe(100);
    });
  });

  describe("Cenário: rejeitar dados inválidos", () => {
    it("Dado nome vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => Professional.create({ fullName: "   " })).toThrow(ValidationError);
    });

    it("Dado commissionPct não inteiro, Quando criar, Então lança ValidationError", () => {
      expect(() => Professional.create({ fullName: "Enf. Ana", commissionPct: 30.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado commissionPct negativo, Quando criar, Então lança ValidationError", () => {
      expect(() => Professional.create({ fullName: "Enf. Ana", commissionPct: -1 })).toThrow(
        ValidationError,
      );
    });

    it("Dado commissionPct maior que 100, Quando criar, Então lança ValidationError", () => {
      expect(() => Professional.create({ fullName: "Enf. Ana", commissionPct: 101 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("Cenário: atualizar dados do profissional", () => {
    it("Dado profissional existente, Quando atualizar fullName, Então retorna nova instância", () => {
      const professional = Professional.create(validProps);

      const updated = professional.update({ fullName: "Enf. Beatriz Souza" });

      expect(updated.fullName).toBe("Enf. Beatriz Souza");
      expect(updated.id).toBe(professional.id);
      expect(professional.fullName).toBe("Enf. Beatriz Lima");
    });

    it("Dado atualização de registry, Quando atualizar, Então registry muda mantendo demais campos", () => {
      const professional = Professional.create(validProps);

      const updated = professional.update({ registry: "COREN-SP 999999" });

      expect(updated.registry).toBe("COREN-SP 999999");
      expect(updated.commissionPct).toBe(30);
    });

    it("Dado registry explicitamente null, Quando atualizar, Então limpa o registro", () => {
      const professional = Professional.create(validProps);

      const updated = professional.update({ registry: null });

      expect(updated.registry).toBeNull();
    });

    it("Dado atualização de commissionPct, Quando atualizar, Então novo percentual aplicado", () => {
      const professional = Professional.create(validProps);

      const updated = professional.update({ commissionPct: 45 });

      expect(updated.commissionPct).toBe(45);
    });

    it("Dado nenhuma mudança, Quando atualizar, Então mantém valores atuais", () => {
      const professional = Professional.create(validProps);

      const updated = professional.update({});

      expect(updated.fullName).toBe(professional.fullName);
      expect(updated.registry).toBe(professional.registry);
      expect(updated.commissionPct).toBe(professional.commissionPct);
    });

    it("Dado atualização inválida, Quando atualizar, Então lança ValidationError", () => {
      const professional = Professional.create(validProps);

      expect(() => professional.update({ fullName: " " })).toThrow(ValidationError);
      expect(() => professional.update({ commissionPct: 200 })).toThrow(ValidationError);
    });
  });

  describe("Cenário: desativar e reativar profissional", () => {
    it("Dado profissional ativo, Quando desativar, Então isActive false", () => {
      const professional = Professional.create(validProps);

      const deactivated = professional.deactivate();

      expect(deactivated.isActive).toBe(false);
      expect(professional.isActive).toBe(true);
    });

    it("Dado profissional inativo, Quando reativar, Então isActive true", () => {
      const professional = Professional.create(validProps).deactivate();

      expect(professional.reactivate().isActive).toBe(true);
    });
  });

  describe("Cenário: reconstituir profissional da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém id e datas", () => {
      const createdAt = new Date("2026-01-15T00:00:00Z");
      const professional = Professional.restore({
        id: "prof-1",
        fullName: "Enf. Carla",
        registry: null,
        commissionPct: null,
        active: false,
        createdAt,
      });

      expect(professional.id).toBe("prof-1");
      expect(professional.isActive).toBe(false);
      expect(professional.createdAt).toEqual(createdAt);
    });
  });
});

import { describe, it, expect } from "vitest";
import { SessionPackage } from "@/domain/billing/package";
import { ValidationError } from "@/domain/shared/errors";

const validProps = {
  patientId: "patient-1",
  procedureId: "procedure-1",
  totalSessions: 10,
  priceCents: 100000,
};

describe("Feature: Pacote de sessões pré-pago", () => {
  describe("Cenário: criar pacote válido", () => {
    it("Dado dados válidos, Quando criar, Então pacote ativo sem sessões consumidas", () => {
      const pkg = SessionPackage.create(validProps);

      expect(pkg.id).toBeTruthy();
      expect(pkg.isActive).toBe(true);
      expect(pkg.usedSessions).toBe(0);
      expect(pkg.remainingSessions).toBe(10);
      expect(pkg.hasBalance).toBe(true);
      expect(pkg.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("Cenário: rejeitar dados inválidos", () => {
    it("Dado patientId vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, patientId: " " })).toThrow(
        ValidationError,
      );
    });

    it("Dado procedureId vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, procedureId: " " })).toThrow(
        ValidationError,
      );
    });

    it("Dado totalSessions não inteiro, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, totalSessions: 2.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado totalSessions menor que 1, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, totalSessions: 0 })).toThrow(
        ValidationError,
      );
    });

    it("Dado totalSessions maior que 100, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, totalSessions: 101 })).toThrow(
        ValidationError,
      );
    });

    it("Dado priceCents não inteiro, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, priceCents: 10.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado priceCents negativo, Quando criar, Então lança ValidationError", () => {
      expect(() => SessionPackage.create({ ...validProps, priceCents: -1 })).toThrow(
        ValidationError,
      );
    });
  });

  describe("Cenário: consumir sessão", () => {
    it("Dado pacote com saldo, Quando consumir, Então usedSessions aumenta imutavelmente", () => {
      const pkg = SessionPackage.create(validProps);

      const consumed = pkg.consumeSession();

      expect(consumed.usedSessions).toBe(1);
      expect(consumed.remainingSessions).toBe(9);
      expect(pkg.usedSessions).toBe(0);
    });

    it("Dado pacote sem saldo (todas sessões usadas), Quando consumir, Então lança ValidationError", () => {
      let pkg = SessionPackage.create({ ...validProps, totalSessions: 1 });
      pkg = pkg.consumeSession();

      expect(pkg.hasBalance).toBe(false);
      expect(() => pkg.consumeSession()).toThrow(ValidationError);
    });

    it("Dado pacote cancelado, Quando consumir, Então lança ValidationError", () => {
      const pkg = SessionPackage.create(validProps).cancel();

      expect(pkg.hasBalance).toBe(false);
      expect(() => pkg.consumeSession()).toThrow(ValidationError);
    });
  });

  describe("Cenário: cancelar pacote", () => {
    it("Dado pacote ativo, Quando cancelar, Então isActive false e original preservado", () => {
      const pkg = SessionPackage.create(validProps);

      const cancelled = pkg.cancel();

      expect(cancelled.isActive).toBe(false);
      expect(pkg.isActive).toBe(true);
    });
  });

  describe("Cenário: reconstituir pacote da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém id e contadores", () => {
      const createdAt = new Date("2026-03-01T00:00:00Z");
      const pkg = SessionPackage.restore({
        id: "pkg-1",
        patientId: "patient-1",
        procedureId: "procedure-1",
        totalSessions: 5,
        usedSessions: 3,
        priceCents: 50000,
        active: true,
        createdAt,
      });

      expect(pkg.id).toBe("pkg-1");
      expect(pkg.usedSessions).toBe(3);
      expect(pkg.remainingSessions).toBe(2);
      expect(pkg.createdAt).toEqual(createdAt);
    });
  });
});

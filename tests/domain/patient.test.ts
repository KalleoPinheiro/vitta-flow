import { describe, it, expect } from "vitest";
import { Patient } from "@/domain/patient/patient";
import { ValidationError } from "@/domain/shared/errors";

const validProps = {
  fullName: "Maria da Silva",
  email: "maria@example.com",
  phone: "11999990000",
};

describe("Feature: Cadastro de paciente", () => {
  describe("Cenário: criar paciente válido", () => {
    it("Dado dados válidos, Quando criar, Então paciente ativo com id gerado", () => {
      const patient = Patient.create(validProps);

      expect(patient.id).toBeTruthy();
      expect(patient.fullName).toBe("Maria da Silva");
      expect(patient.isActive).toBe(true);
      expect(patient.createdAt).toBeInstanceOf(Date);
    });

    it("Dado nome com espaços nas bordas, Quando criar, Então nome é normalizado", () => {
      const patient = Patient.create({ ...validProps, fullName: "  João Souza  " });

      expect(patient.fullName).toBe("João Souza");
    });
  });

  describe("Cenário: rejeitar dados inválidos", () => {
    it("Dado nome muito curto, Quando criar, Então lança ValidationError", () => {
      expect(() => Patient.create({ ...validProps, fullName: "Jo" })).toThrow(ValidationError);
    });

    it("Dado email inválido, Quando criar, Então lança ValidationError", () => {
      expect(() => Patient.create({ ...validProps, email: "not-an-email" })).toThrow(
        ValidationError,
      );
    });

    it("Dado telefone vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => Patient.create({ ...validProps, phone: "" })).toThrow(ValidationError);
    });
  });

  describe("Cenário: atualizar dados do paciente", () => {
    it("Dado paciente existente, Quando atualizar nome, Então retorna novo Patient com nome novo", () => {
      const patient = Patient.create(validProps);

      const updated = patient.update({ fullName: "Maria Oliveira" });

      expect(updated.fullName).toBe("Maria Oliveira");
      expect(updated.id).toBe(patient.id);
      expect(patient.fullName).toBe("Maria da Silva");
    });

    it("Dado atualização inválida, Quando atualizar, Então lança ValidationError", () => {
      const patient = Patient.create(validProps);

      expect(() => patient.update({ email: "broken" })).toThrow(ValidationError);
    });
  });

  describe("Cenário: desativar e reativar paciente", () => {
    it("Dado paciente ativo, Quando desativar, Então isActive é false", () => {
      const patient = Patient.create(validProps);

      const deactivated = patient.deactivate();

      expect(deactivated.isActive).toBe(false);
      expect(patient.isActive).toBe(true);
    });

    it("Dado paciente inativo, Quando reativar, Então isActive é true", () => {
      const patient = Patient.create(validProps).deactivate();

      expect(patient.reactivate().isActive).toBe(true);
    });
  });

  describe("Cenário: reconstituir paciente da persistência", () => {
    it("Dado props completas com id, Quando restore, Então mantém id e datas", () => {
      const createdAt = new Date("2026-01-01T12:00:00Z");
      const patient = Patient.restore({
        id: "abc-123",
        fullName: "Maria da Silva",
        email: "maria@example.com",
        phone: "11999990000",
        birthDate: null,
        notes: null,
        active: false,
        createdAt,
      });

      expect(patient.id).toBe("abc-123");
      expect(patient.isActive).toBe(false);
      expect(patient.createdAt).toEqual(createdAt);
    });
  });
});

import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { ConsentRecord, hashConsentText } from "@/domain/consent/consent-record";
import { ValidationError } from "@/domain/shared/errors";

const validInput = {
  patientId: "patient-1",
  consentText: "Termo de consentimento para monitoramento remoto.",
  ipAddress: "203.0.113.10",
};

describe("Feature: Aceite digital do termo de consentimento", () => {
  describe("Cenário: registrar aceite válido", () => {
    it("Dado dados válidos, Quando criar, Então aceite com hash SHA-256 do texto", () => {
      const record = ConsentRecord.create(validInput);

      const expectedHash = createHash("sha256")
        .update(validInput.consentText, "utf8")
        .digest("hex");

      expect(record.id).toBeTruthy();
      expect(record.patientId).toBe("patient-1");
      expect(record.textHash).toBe(expectedHash);
      expect(record.ipAddress).toBe("203.0.113.10");
      expect(record.acceptedAt).toBeInstanceOf(Date);
    });

    it("Dado ipAddress omitido, Quando criar, Então ipAddress é nulo", () => {
      const record = ConsentRecord.create({
        patientId: "patient-1",
        consentText: "Termo",
      });

      expect(record.ipAddress).toBeNull();
    });

    it("Dado ipAddress com espaços, Quando criar, Então ipAddress é normalizado", () => {
      const record = ConsentRecord.create({ ...validInput, ipAddress: "  203.0.113.10  " });

      expect(record.ipAddress).toBe("203.0.113.10");
    });
  });

  describe("Cenário: rejeitar dados inválidos", () => {
    it("Dado patientId vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => ConsentRecord.create({ ...validInput, patientId: " " })).toThrow(
        ValidationError,
      );
    });

    it("Dado texto do termo vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => ConsentRecord.create({ ...validInput, consentText: " " })).toThrow(
        ValidationError,
      );
    });
  });

  describe("Cenário: verificar cobertura do aceite (covers)", () => {
    it("Dado o mesmo texto, Quando verificar covers, Então retorna true", () => {
      const record = ConsentRecord.create(validInput);

      expect(record.covers(validInput.consentText)).toBe(true);
    });

    it("Dado texto diferente, Quando verificar covers, Então retorna false", () => {
      const record = ConsentRecord.create(validInput);

      expect(record.covers("Texto do termo alterado")).toBe(false);
    });
  });

  describe("Cenário: reconstituir aceite da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém id e hash", () => {
      const acceptedAt = new Date("2026-04-01T00:00:00Z");
      const record = ConsentRecord.restore({
        id: "consent-1",
        patientId: "patient-1",
        textHash: "abc123",
        ipAddress: null,
        acceptedAt,
      });

      expect(record.id).toBe("consent-1");
      expect(record.textHash).toBe("abc123");
      expect(record.ipAddress).toBeNull();
      expect(record.acceptedAt).toEqual(acceptedAt);
    });
  });
});

describe("Feature: Hash SHA-256 do texto de consentimento (hashConsentText)", () => {
  it("Dado um texto, Quando calcular hash, Então retorna o SHA-256 hexadecimal esperado", () => {
    const text = "Texto de exemplo";

    expect(hashConsentText(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
  });
});

import { describe, it, expect } from "vitest";
import { Clinic, isClinicInfoComplete } from "@/domain/clinic/clinic";

describe("Feature: Dados cadastrais da clínica (issue #61/#62)", () => {
  describe("Cenário: criação", () => {
    it("Dado nome e createdBy, Quando criar, Então campos cadastrais nascem nulos", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" });

      expect(clinic.cnpj).toBeNull();
      expect(clinic.address).toBeNull();
      expect(clinic.city).toBeNull();
      expect(clinic.professionalName).toBeNull();
      expect(clinic.professionalRegistry).toBeNull();
    });
  });

  describe("Cenário: updateInfo é imutável", () => {
    it("Dada uma clínica, Quando atualizar CNPJ, Então retorna nova instância sem mutar a original", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" });

      const updated = clinic.updateInfo({ cnpj: "12.345.678/0001-90" });

      expect(clinic.cnpj).toBeNull();
      expect(updated.cnpj).toBe("12.345.678/0001-90");
      expect(updated).not.toBe(clinic);
    });

    it("Dada uma clínica com dados salvos, Quando atualizar só um campo, Então os demais são preservados", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" }).updateInfo({
        cnpj: "12.345.678/0001-90",
        professionalName: "Enf. Ana",
        professionalRegistry: "COREN-SP 123456",
      });

      const updated = clinic.updateInfo({ city: "São Paulo" });

      expect(updated.cnpj).toBe("12.345.678/0001-90");
      expect(updated.professionalName).toBe("Enf. Ana");
      expect(updated.city).toBe("São Paulo");
    });

    it("Dada uma clínica, Quando atualizar o nome, Então persiste a nova razão social", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" });

      const updated = clinic.updateInfo({ name: "Clínica Alfa Ltda" });

      expect(updated.name).toBe("Clínica Alfa Ltda");
      expect(clinic.name).toBe("Clínica Alfa");
    });

    it("Dado nome vazio, Quando atualizar, Então lança ValidationError", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" });

      expect(() => clinic.updateInfo({ name: "   " })).toThrow("Nome da clínica é obrigatório");
    });

    it("Dado nenhum campo name no update, Quando atualizar outro campo, Então o nome permanece intacto", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" });

      const updated = clinic.updateInfo({ cnpj: "12.345.678/0001-90" });

      expect(updated.name).toBe("Clínica Alfa");
    });

    it("Dado um campo com espaços em branco, Quando atualizar, Então normaliza para null", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" }).updateInfo({
        cnpj: "12.345.678/0001-90",
      });

      const updated = clinic.updateInfo({ cnpj: "   " });

      expect(updated.cnpj).toBeNull();
    });
  });

  describe("Cenário: completude para emissão de documento (#62)", () => {
    it("Dados os 3 campos obrigatórios preenchidos, Quando checar completude, Então retorna true", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" }).updateInfo({
        cnpj: "12.345.678/0001-90",
        professionalName: "Enf. Ana",
        professionalRegistry: "COREN-SP 123456",
      });

      expect(clinic.isCompleteForDocumentEmission()).toBe(true);
    });

    it.each([
      ["cnpj", { professionalName: "Enf. Ana", professionalRegistry: "COREN-SP 123456" }],
      ["professionalName", { cnpj: "12.345.678/0001-90", professionalRegistry: "COREN-SP 123456" }],
      ["professionalRegistry", { cnpj: "12.345.678/0001-90", professionalName: "Enf. Ana" }],
    ])("Dado %s ausente, Quando checar completude, Então retorna false", (_field, fields) => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" }).updateInfo(
        fields,
      );

      expect(clinic.isCompleteForDocumentEmission()).toBe(false);
    });

    it("Dado endereço e cidade ausentes mas os 3 obrigatórios presentes, Quando checar completude, Então retorna true", () => {
      const clinic = Clinic.create({ name: "Clínica Alfa", createdBy: "admin@vitta.com" }).updateInfo({
        cnpj: "12.345.678/0001-90",
        professionalName: "Enf. Ana",
        professionalRegistry: "COREN-SP 123456",
      });

      expect(clinic.address).toBeNull();
      expect(clinic.city).toBeNull();
      expect(clinic.isCompleteForDocumentEmission()).toBe(true);
    });

    it("Dado info nula, Quando checar isClinicInfoComplete, Então retorna false", () => {
      expect(isClinicInfoComplete(null)).toBe(false);
    });
  });
});

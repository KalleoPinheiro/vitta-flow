import { describe, it, expect, afterEach } from "vitest";
import { getClinicInfo } from "@/lib/clinic-info";

const CLINIC_ENV_KEYS = [
  "CLINIC_NAME",
  "CLINIC_CNPJ",
  "CLINIC_ADDRESS",
  "CLINIC_PROFESSIONAL_NAME",
  "CLINIC_PROFESSIONAL_REGISTRY",
  "CLINIC_CITY",
] as const;

const savedEnv: Record<string, string | undefined> = {};

describe("Feature: Dados da clínica via variáveis de ambiente", () => {
  afterEach(() => {
    for (const key of CLINIC_ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it("Dado nenhuma variável de ambiente definida, Quando getClinicInfo, Então usa defaults neutros", () => {
    for (const key of CLINIC_ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    const info = getClinicInfo();

    expect(info).toEqual({
      name: "VittaFlow — Clínica de Estomaterapia",
      cnpj: null,
      address: null,
      professionalName: null,
      professionalRegistry: null,
      city: null,
    });
  });

  it("Dado todas as variáveis de ambiente definidas, Quando getClinicInfo, Então retorna os valores configurados", () => {
    for (const key of CLINIC_ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
    process.env.CLINIC_NAME = "Clínica Vitta";
    process.env.CLINIC_CNPJ = "00.000.000/0001-00";
    process.env.CLINIC_ADDRESS = "Rua das Flores, 123";
    process.env.CLINIC_PROFESSIONAL_NAME = "Dra. Maria Silva";
    process.env.CLINIC_PROFESSIONAL_REGISTRY = "COREN-SP 123456";
    process.env.CLINIC_CITY = "São Paulo";

    const info = getClinicInfo();

    expect(info).toEqual({
      name: "Clínica Vitta",
      cnpj: "00.000.000/0001-00",
      address: "Rua das Flores, 123",
      professionalName: "Dra. Maria Silva",
      professionalRegistry: "COREN-SP 123456",
      city: "São Paulo",
    });
  });
});

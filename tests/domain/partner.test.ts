import { describe, it, expect } from "vitest";
import { Partner } from "@/domain/partner/partner";
import { Patient } from "@/domain/patient/patient";
import { ValidationError } from "@/domain/shared/errors";

const validProps = {
  fullName: "Dr. Carlos Andrade",
  email: "carlos@clinicavascular.com",
  phone: "11955550000",
  crm: "CRM-SP 123456",
  specialty: "Cirurgia vascular",
};

describe("Feature: Médico parceiro (indicação)", () => {
  it("Dado dados válidos, Quando criar, Então parceiro ativo com email normalizado", () => {
    const partner = Partner.create({ ...validProps, email: " Carlos@ClinicaVascular.com " });

    expect(partner.id).toBeTruthy();
    expect(partner.email).toBe("carlos@clinicavascular.com");
    expect(partner.isActive).toBe(true);
    expect(partner.crm).toBe("CRM-SP 123456");
  });

  it("Dado nome curto ou email inválido, Quando criar, Então lança ValidationError", () => {
    expect(() => Partner.create({ ...validProps, fullName: "Dr" })).toThrow(ValidationError);
    expect(() => Partner.create({ ...validProps, email: "sem-arroba" })).toThrow(ValidationError);
  });

  it("Dado parceiro, Quando atualizar e desativar, Então imutável e persiste estado", () => {
    const partner = Partner.create(validProps);

    const updated = partner.update({ specialty: "Angiologia" }).deactivate();

    expect(updated.specialty).toBe("Angiologia");
    expect(updated.isActive).toBe(false);
    expect(partner.isActive).toBe(true);
  });

  it("Dado restore, Quando reconstituir, Então mantém id e campos", () => {
    const partner = Partner.restore({
      id: "partner-1",
      fullName: "Dra. Ana",
      email: "ana@x.com",
      phone: "11",
      crm: null,
      specialty: null,
      active: false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(partner.id).toBe("partner-1");
    expect(partner.isActive).toBe(false);
  });
});

describe("Feature: Paciente indicado por parceiro", () => {
  const patientProps = {
    fullName: "Maria da Silva",
    email: "maria@example.com",
    phone: "11999990000",
  };

  it("Dado indicação, Quando criar paciente, Então guarda referredByPartnerId", () => {
    const patient = Patient.create({ ...patientProps, referredByPartnerId: "partner-1" });

    expect(patient.referredByPartnerId).toBe("partner-1");
  });

  it("Dado paciente sem indicação, Quando criar, Então referredByPartnerId null", () => {
    expect(Patient.create(patientProps).referredByPartnerId).toBeNull();
  });

  it("Dado paciente, Quando atualizar indicação, Então nova instância com parceiro", () => {
    const patient = Patient.create(patientProps);

    const updated = patient.update({ referredByPartnerId: "partner-2" });
    const cleared = updated.update({ referredByPartnerId: null });

    expect(updated.referredByPartnerId).toBe("partner-2");
    expect(cleared.referredByPartnerId).toBeNull();
  });
});

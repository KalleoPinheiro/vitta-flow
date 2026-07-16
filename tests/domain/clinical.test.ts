import { describe, it, expect } from "vitest";
import { Anamnesis } from "@/domain/clinical/anamnesis";
import { EvolutionNote } from "@/domain/clinical/evolution-note";
import { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import { ConditionAssessment } from "@/domain/clinical/condition-assessment";
import { ValidationError, InvalidStatusTransitionError } from "@/domain/shared/errors";

describe("Feature: Anamnese do paciente", () => {
  it("Dado dados, Quando criar, Então anamnese vinculada ao paciente com updatedAt", () => {
    const anamnesis = Anamnesis.create({
      patientId: "p1",
      comorbidities: "Diabetes tipo 2, HAS",
      allergies: "Adesivo hidrocoloide",
      medications: "Metformina 850mg",
      surgicalHistory: "Colectomia 2024",
      notes: "",
    });

    expect(anamnesis.patientId).toBe("p1");
    expect(anamnesis.allergies).toBe("Adesivo hidrocoloide");
    expect(anamnesis.updatedAt).toBeInstanceOf(Date);
  });

  it("Dado anamnese existente, Quando atualizar, Então retorna nova instância com dados novos", () => {
    const anamnesis = Anamnesis.create({ patientId: "p1" });

    const updated = anamnesis.update({ allergies: "Látex" });

    expect(updated.allergies).toBe("Látex");
    expect(anamnesis.allergies).toBe("");
  });
});

describe("Feature: Evolução de enfermagem (SOAP)", () => {
  it("Dado ao menos um campo SOAP, Quando criar, Então evolução criada", () => {
    const note = EvolutionNote.create({
      patientId: "p1",
      subjective: "Paciente refere prurido periestomal",
      objective: "",
      assessment: "",
      plan: "",
    });

    expect(note.id).toBeTruthy();
    expect(note.subjective).toContain("prurido");
  });

  it("Dado todos os campos vazios, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      EvolutionNote.create({ patientId: "p1", subjective: " ", objective: "", assessment: "", plan: "" }),
    ).toThrow(ValidationError);
  });

  it("Dado appointmentId, Quando criar, Então evolução vinculada à consulta", () => {
    const note = EvolutionNote.create({
      patientId: "p1",
      appointmentId: "appt-1",
      subjective: "",
      objective: "Estoma róseo, protruso",
      assessment: "",
      plan: "",
    });

    expect(note.appointmentId).toBe("appt-1");
  });
});

describe("Feature: Condições clínicas (estomia e ferida)", () => {
  it("Dado estomia com tipo, Quando criar, Então condição ativa", () => {
    const condition = ClinicalCondition.create({
      patientId: "p1",
      kind: "stoma",
      title: "Colostomia terminal QIE",
      stomaType: "colostomia",
    });

    expect(condition.status).toBe("active");
    expect(condition.stomaType).toBe("colostomia");
  });

  it("Dado estomia sem tipo, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      ClinicalCondition.create({ patientId: "p1", kind: "stoma", title: "Estomia" }),
    ).toThrow(ValidationError);
  });

  it("Dado ferida, Quando criar sem stomaType, Então ok", () => {
    const condition = ClinicalCondition.create({
      patientId: "p1",
      kind: "wound",
      title: "Úlcera venosa MMII E",
    });

    expect(condition.kind).toBe("wound");
    expect(condition.stomaType).toBeNull();
  });

  it("Dado título vazio, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      ClinicalCondition.create({ patientId: "p1", kind: "wound", title: "  " }),
    ).toThrow(ValidationError);
  });

  it("Dado condição ativa, Quando resolver, Então status resolved; resolver de novo lança erro", () => {
    const condition = ClinicalCondition.create({
      patientId: "p1",
      kind: "wound",
      title: "Úlcera",
    });

    const resolved = condition.resolve();

    expect(resolved.status).toBe("resolved");
    expect(() => resolved.resolve()).toThrow(InvalidStatusTransitionError);
  });
});

describe("Feature: Avaliação seriada de condição", () => {
  const base = {
    conditionId: "c1",
    lengthMm: 40,
    widthMm: 20,
    depthMm: 5,
    tissueType: "granulação",
    exudate: "low" as const,
    painScale: 3,
    notes: "",
  };

  it("Dado medidas válidas, Quando avaliar, Então área calculada em mm²", () => {
    const assessment = ConditionAssessment.create(base);

    expect(assessment.areaMm2).toBe(800);
    expect(assessment.painScale).toBe(3);
  });

  it("Dado dor fora de 0-10, Quando avaliar, Então lança ValidationError", () => {
    expect(() => ConditionAssessment.create({ ...base, painScale: 11 })).toThrow(ValidationError);
    expect(() => ConditionAssessment.create({ ...base, painScale: -1 })).toThrow(ValidationError);
  });

  it("Dado medida negativa, Quando avaliar, Então lança ValidationError", () => {
    expect(() => ConditionAssessment.create({ ...base, lengthMm: -5 })).toThrow(ValidationError);
  });

  it("Dado avaliação de estomia sem medidas, Quando avaliar, Então ok e área nula", () => {
    const assessment = ConditionAssessment.create({
      conditionId: "c1",
      skinCondition: "Dermatite periestomal leve",
      complications: "dermatite",
      notes: "Orientada troca com barreira",
    });

    expect(assessment.areaMm2).toBeNull();
    expect(assessment.skinCondition).toContain("Dermatite");
  });
});

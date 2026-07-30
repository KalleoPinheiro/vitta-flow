import { describe, it, expect } from "vitest";
import { Anamnesis } from "@/domain/clinical/anamnesis";
import { EvolutionNote } from "@/domain/clinical/evolution-note";
import { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import { ConditionAssessment } from "@/domain/clinical/condition-assessment";
import {
  ConditionPhoto,
  detectImageType,
  MAX_PHOTO_BYTES,
  PHOTO_CONTENT_TYPES,
} from "@/domain/clinical/condition-photo";
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

  it("Dado apenas patientId, Quando criar, Então campos de texto ficam vazios", () => {
    const anamnesis = Anamnesis.create({ patientId: "p1" });

    expect(anamnesis.comorbidities).toBe("");
    expect(anamnesis.allergies).toBe("");
    expect(anamnesis.medications).toBe("");
    expect(anamnesis.surgicalHistory).toBe("");
    expect(anamnesis.notes).toBe("");
  });

  it("Dado patientId vazio, Quando criar, Então lança ValidationError", () => {
    expect(() => Anamnesis.create({ patientId: "   " })).toThrow(ValidationError);
  });

  it("Dado anamnese existente, Quando atualizar, Então retorna nova instância com dados novos", () => {
    const anamnesis = Anamnesis.create({ patientId: "p1" });

    const updated = anamnesis.update({ allergies: "Látex" });

    expect(updated.allergies).toBe("Látex");
    expect(anamnesis.allergies).toBe("");
  });

  it("Dado múltiplos campos, Quando atualizar, Então todos são mesclados e demais preservados", () => {
    const anamnesis = Anamnesis.create({ patientId: "p1", allergies: "Látex" });

    const updated = anamnesis.update({
      comorbidities: "HAS",
      medications: "Losartana",
      surgicalHistory: "  Apendicectomia  ",
      notes: "Acompanhamento mensal",
    });

    expect(updated.comorbidities).toBe("HAS");
    expect(updated.medications).toBe("Losartana");
    expect(updated.surgicalHistory).toBe("Apendicectomia");
    expect(updated.notes).toBe("Acompanhamento mensal");
    expect(updated.allergies).toBe("Látex");
  });

  it("Dado nenhuma mudança, Quando atualizar, Então mantém todos os campos atuais", () => {
    const anamnesis = Anamnesis.create({ patientId: "p1", allergies: "Látex" });

    const updated = anamnesis.update({});

    expect(updated.allergies).toBe("Látex");
    expect(updated.comorbidities).toBe(anamnesis.comorbidities);
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos e updatedAt", () => {
    const updatedAt = new Date("2026-02-01T00:00:00Z");
    const anamnesis = Anamnesis.restore({
      patientId: "p1",
      comorbidities: "HAS",
      allergies: "",
      medications: "",
      surgicalHistory: "",
      notes: "",
      updatedAt,
    });

    expect(anamnesis.comorbidities).toBe("HAS");
    expect(anamnesis.updatedAt).toEqual(updatedAt);
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

describe("Feature: Foto de evolução de condição", () => {
  const baseProps = {
    conditionId: "condition-1",
    contentType: "image/jpeg" as const,
    sizeBytes: 1024,
  };

  describe("Cenário: criar foto válida", () => {
    it("Dado dados válidos, Quando criar, Então foto com origem staff e sem triagem", () => {
      const photo = ConditionPhoto.create(baseProps);

      expect(photo.id).toBeTruthy();
      expect(photo.origin).toBe("staff");
      expect(photo.triageStatus).toBeNull();
      expect(photo.createdAt).toBeInstanceOf(Date);
    });

    it("Dado cada tipo de conteúdo suportado, Quando criar, Então aceita", () => {
      for (const contentType of PHOTO_CONTENT_TYPES) {
        const photo = ConditionPhoto.create({ ...baseProps, contentType });
        expect(photo.contentType).toBe(contentType);
      }
    });

    it("Dado origem paciente, Quando criar, Então triageStatus inicia pending", () => {
      const photo = ConditionPhoto.create({ ...baseProps, origin: "patient", patientNote: "Dói um pouco" });

      expect(photo.origin).toBe("patient");
      expect(photo.triageStatus).toBe("pending");
      expect(photo.patientNote).toBe("Dói um pouco");
    });

    it("Dado assessmentId e patientNote omitidos, Quando criar, Então ambos são nulos", () => {
      const photo = ConditionPhoto.create(baseProps);

      expect(photo.assessmentId).toBeNull();
      expect(photo.patientNote).toBeNull();
    });

    it("Dado tamanho igual ao limite máximo, Quando criar, Então aceita", () => {
      const photo = ConditionPhoto.create({ ...baseProps, sizeBytes: MAX_PHOTO_BYTES });

      expect(photo.sizeBytes).toBe(MAX_PHOTO_BYTES);
    });
  });

  describe("Cenário: rejeitar dados inválidos", () => {
    it("Dado contentType não suportado, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        ConditionPhoto.create({
          ...baseProps,
          contentType: "image/gif" as unknown as typeof baseProps.contentType,
        }),
      ).toThrow(ValidationError);
    });

    it("Dado sizeBytes não inteiro ou não positivo, Quando criar, Então lança ValidationError", () => {
      expect(() => ConditionPhoto.create({ ...baseProps, sizeBytes: 0 })).toThrow(
        ValidationError,
      );
      expect(() => ConditionPhoto.create({ ...baseProps, sizeBytes: 10.5 })).toThrow(
        ValidationError,
      );
    });

    it("Dado sizeBytes acima do limite, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        ConditionPhoto.create({ ...baseProps, sizeBytes: MAX_PHOTO_BYTES + 1 }),
      ).toThrow(ValidationError);
    });
  });

  describe("Cenário: triagem de foto enviada pelo paciente", () => {
    it("Dado foto do paciente, Quando triar, Então status muda para reviewed ou escalated", () => {
      const photo = ConditionPhoto.create({ ...baseProps, origin: "patient" });

      expect(photo.withTriage("reviewed").triageStatus).toBe("reviewed");
      expect(photo.withTriage("escalated").triageStatus).toBe("escalated");
    });

    it("Dado foto da equipe, Quando triar, Então lança ValidationError", () => {
      const photo = ConditionPhoto.create(baseProps);

      expect(() => photo.withTriage("reviewed")).toThrow(ValidationError);
    });
  });

  describe("Cenário: reconstituir foto da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém id e origem", () => {
      const createdAt = new Date("2026-01-01T00:00:00Z");
      const photo = ConditionPhoto.restore({
        id: "photo-1",
        conditionId: "condition-1",
        contentType: "image/png",
        sizeBytes: 2048,
        assessmentId: "assessment-1",
        origin: "patient",
        patientNote: null,
        triageStatus: "escalated",
        createdAt,
      });

      expect(photo.id).toBe("photo-1");
      expect(photo.origin).toBe("patient");
      expect(photo.triageStatus).toBe("escalated");
      expect(photo.createdAt).toEqual(createdAt);
    });

    it("Dado origin ausente no state restaurado, Quando ler getter, Então assume staff", () => {
      const photo = ConditionPhoto.restore({
        id: "photo-2",
        conditionId: "condition-1",
        contentType: "image/png",
        sizeBytes: 2048,
        assessmentId: null,
        patientNote: null,
        triageStatus: null,
        createdAt: new Date(),
      });

      expect(photo.origin).toBe("staff");
    });
  });
});

describe("Feature: Detecção de tipo de imagem por magic bytes (detectImageType)", () => {
  it("Dado bytes de assinatura JPEG, Quando detectar, Então retorna image/jpeg", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("Dado bytes de assinatura PNG, Quando detectar, Então retorna image/png", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
  });

  it("Dado bytes de assinatura WebP (RIFF....WEBP), Quando detectar, Então retorna image/webp", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);

    expect(detectImageType(bytes)).toBe("image/webp");
  });

  it("Dado bytes sem assinatura conhecida, Quando detectar, Então retorna null", () => {
    expect(detectImageType(new Uint8Array([0x00, 0x01, 0x02]))).toBeNull();
  });

  it("Dado bytes menores que a assinatura, Quando detectar, Então retorna null", () => {
    expect(detectImageType(new Uint8Array([0xff]))).toBeNull();
  });
});

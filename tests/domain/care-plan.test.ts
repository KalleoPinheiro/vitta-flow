import { describe, it, expect } from "vitest";
import { CarePlan } from "@/domain/clinical/care-plan";
import { CarePlanDiagnosis } from "@/domain/clinical/care-plan-diagnosis";
import { CarePlanOutcome } from "@/domain/clinical/care-plan-outcome";
import { CarePlanIntervention } from "@/domain/clinical/care-plan-intervention";
import { OutcomeEvaluation } from "@/domain/clinical/outcome-evaluation";
import { InterventionRecord } from "@/domain/clinical/intervention-record";
import { InvalidStatusTransitionError, ValidationError } from "@/domain/shared/errors";

describe("Feature: Plano de cuidados (SAE)", () => {
  describe("Cenário: abrir plano de cuidados", () => {
    it("Dado paciente e condição, Quando criar, Então plano ativo vinculado a ambos", () => {
      const plan = CarePlan.create({
        patientId: "p1",
        conditionId: "c1",
        professionalId: "prof1",
      });

      expect(plan.id).toBeTruthy();
      expect(plan.patientId).toBe("p1");
      expect(plan.conditionId).toBe("c1");
      expect(plan.status).toBe("active");
      expect(plan.isActive).toBe(true);
    });

    it("Dado apenas paciente, Quando criar, Então conditionId é null (diagnóstico do paciente)", () => {
      const plan = CarePlan.create({ patientId: "p1" });

      expect(plan.conditionId).toBeNull();
    });

    it("Dado patientId vazio, Quando criar, Então lança ValidationError", () => {
      expect(() => CarePlan.create({ patientId: "  " })).toThrow(ValidationError);
    });
  });

  describe("Cenário: transições de status", () => {
    it("Dado plano ativo, Quando resolver, Então status é resolved", () => {
      const plan = CarePlan.create({ patientId: "p1" });

      const resolved = plan.resolve();

      expect(resolved.status).toBe("resolved");
      expect(resolved.isActive).toBe(false);
      expect(plan.status).toBe("active");
    });

    it("Dado plano já resolvido, Quando resolver novamente, Então lança InvalidStatusTransitionError", () => {
      const plan = CarePlan.create({ patientId: "p1" }).resolve();

      expect(() => plan.resolve()).toThrow(InvalidStatusTransitionError);
    });

    it("Dado plano ativo, Quando cancelar, Então status é cancelled", () => {
      const plan = CarePlan.create({ patientId: "p1" });

      expect(plan.cancel().status).toBe("cancelled");
    });

    it("Dado plano cancelado, Quando resolver, Então lança InvalidStatusTransitionError", () => {
      const plan = CarePlan.create({ patientId: "p1" }).cancel();

      expect(() => plan.resolve()).toThrow(InvalidStatusTransitionError);
    });
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const plan = CarePlan.restore({
      id: "cp1",
      patientId: "p1",
      conditionId: "c1",
      professionalId: "prof1",
      status: "resolved",
      createdAt,
    });

    expect(plan.id).toBe("cp1");
    expect(plan.professionalId).toBe("prof1");
    expect(plan.status).toBe("resolved");
    expect(plan.createdAt).toEqual(createdAt);
  });
});

describe("Feature: Diagnóstico de enfermagem no formato PES", () => {
  describe("Cenário: diagnóstico real", () => {
    it("Dado etiologia e evidência, Quando criar, Então diagnóstico real criado", () => {
      const diagnosis = CarePlanDiagnosis.create({
        carePlanId: "cp1",
        diagnosisCode: "00046",
        type: "real",
        relatedFactors: "Umidade excessiva por exsudato",
        definingCharacteristics: "Ruptura da epiderme",
      });

      expect(diagnosis.type).toBe("real");
      expect(diagnosis.relatedFactors).toBe("Umidade excessiva por exsudato");
      expect(diagnosis.definingCharacteristics).toBe("Ruptura da epiderme");
    });

    it("Dado diagnóstico real sem evidência, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        CarePlanDiagnosis.create({
          carePlanId: "cp1",
          diagnosisCode: "00046",
          type: "real",
          relatedFactors: "Umidade excessiva",
          definingCharacteristics: null,
        }),
      ).toThrow(ValidationError);
    });

    it("Dado diagnóstico real sem etiologia, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        CarePlanDiagnosis.create({
          carePlanId: "cp1",
          diagnosisCode: "00046",
          type: "real",
          relatedFactors: null,
          definingCharacteristics: "Ruptura da epiderme",
        }),
      ).toThrow(ValidationError);
    });
  });

  describe("Cenário: diagnóstico de risco", () => {
    it("Dado apenas fatores de risco, Quando criar, Então diagnóstico de risco criado", () => {
      const diagnosis = CarePlanDiagnosis.create({
        carePlanId: "cp1",
        diagnosisCode: "00047",
        type: "risco",
        relatedFactors: "Imobilidade prolongada",
      });

      expect(diagnosis.type).toBe("risco");
      expect(diagnosis.definingCharacteristics).toBeNull();
    });

    it("Dado diagnóstico de risco com característica definidora, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        CarePlanDiagnosis.create({
          carePlanId: "cp1",
          diagnosisCode: "00047",
          type: "risco",
          relatedFactors: "Imobilidade prolongada",
          definingCharacteristics: "Eritema em região sacral",
        }),
      ).toThrow(ValidationError);
    });

    it("Dado diagnóstico de risco sem fatores de risco, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        CarePlanDiagnosis.create({
          carePlanId: "cp1",
          diagnosisCode: "00047",
          type: "risco",
          relatedFactors: null,
        }),
      ).toThrow(ValidationError);
    });
  });

  describe("Cenário: diagnóstico de promoção da saúde", () => {
    it("Dado apenas o código, Quando criar, Então diagnóstico é aceito sem etiologia/evidência", () => {
      const diagnosis = CarePlanDiagnosis.create({
        carePlanId: "cp1",
        diagnosisCode: "00162",
        type: "promocao-saude",
      });

      expect(diagnosis.type).toBe("promocao-saude");
      expect(diagnosis.relatedFactors).toBeNull();
      expect(diagnosis.definingCharacteristics).toBeNull();
    });
  });

  it("Dado carePlanId vazio, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      CarePlanDiagnosis.create({ carePlanId: " ", diagnosisCode: "00046", type: "promocao-saude" }),
    ).toThrow(ValidationError);
  });

  it("Dado diagnosisCode vazio, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      CarePlanDiagnosis.create({ carePlanId: "cp1", diagnosisCode: " ", type: "promocao-saude" }),
    ).toThrow(ValidationError);
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const diagnosis = CarePlanDiagnosis.restore({
      id: "d1",
      carePlanId: "cp1",
      diagnosisCode: "00046",
      type: "real",
      relatedFactors: "Umidade",
      definingCharacteristics: "Ruptura",
      createdAt,
    });

    expect(diagnosis.id).toBe("d1");
    expect(diagnosis.createdAt).toEqual(createdAt);
  });
});

describe("Feature: Resultado NOC prescrito (CarePlanOutcome)", () => {
  describe("Cenário: prescrever resultado", () => {
    it("Dado basal e meta válidos, Quando criar, Então resultado prescrito", () => {
      const outcome = CarePlanOutcome.create({
        carePlanId: "cp1",
        outcomeCode: "1101",
        baselineScore: 2,
        targetScore: 4,
      });

      expect(outcome.baselineScore).toBe(2);
      expect(outcome.targetScore).toBe(4);
    });

    it("Dado meta menor ou igual à basal, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        CarePlanOutcome.create({ carePlanId: "cp1", outcomeCode: "1101", baselineScore: 3, targetScore: 3 }),
      ).toThrow(ValidationError);
      expect(() =>
        CarePlanOutcome.create({ carePlanId: "cp1", outcomeCode: "1101", baselineScore: 4, targetScore: 2 }),
      ).toThrow(ValidationError);
    });

    it("Dado pontuação fora de 1–5, Quando criar, Então lança ValidationError", () => {
      expect(() =>
        CarePlanOutcome.create({ carePlanId: "cp1", outcomeCode: "1101", baselineScore: 0, targetScore: 4 }),
      ).toThrow(ValidationError);
      expect(() =>
        CarePlanOutcome.create({ carePlanId: "cp1", outcomeCode: "1101", baselineScore: 2, targetScore: 6 }),
      ).toThrow(ValidationError);
    });
  });

  describe("Cenário: progresso derivado de avaliações", () => {
    const outcome = CarePlanOutcome.create({
      carePlanId: "cp1",
      outcomeCode: "1101",
      baselineScore: 2,
      targetScore: 4,
    });

    it("Dado nenhuma avaliação, Quando consultar progresso, Então tudo é null (score nunca é chutado)", () => {
      expect(outcome.currentScore([])).toBeNull();
      expect(outcome.attainment([])).toBeNull();
      expect(outcome.isAchieved([])).toBeNull();
    });

    it("Dado avaliação atingindo a meta, Quando consultar progresso, Então isAchieved é verdadeiro e attainment é 1", () => {
      const evaluations = [{ score: 4, evaluatedAt: new Date("2026-02-01") }];

      expect(outcome.currentScore(evaluations)).toBe(4);
      expect(outcome.attainment(evaluations)).toBe(1);
      expect(outcome.isAchieved(evaluations)).toBe(true);
    });

    it("Dado avaliação parcial, Quando consultar progresso, Então attainment reflete a fração do caminho", () => {
      const evaluations = [{ score: 3, evaluatedAt: new Date("2026-02-01") }];

      expect(outcome.attainment(evaluations)).toBe(0.5);
      expect(outcome.isAchieved(evaluations)).toBe(false);
    });

    it("Dado avaliação com regressão (abaixo da basal), Quando consultar progresso, Então attainment é negativo", () => {
      const evaluations = [{ score: 1, evaluatedAt: new Date("2026-02-01") }];

      expect(outcome.attainment(evaluations)).toBe(-0.5);
      expect(outcome.isAchieved(evaluations)).toBe(false);
    });

    it("Dado múltiplas avaliações, Quando consultar progresso, Então usa a mais recente, não a última inserida", () => {
      const evaluations = [
        { score: 4, evaluatedAt: new Date("2026-02-10") },
        { score: 2, evaluatedAt: new Date("2026-02-01") },
      ];

      expect(outcome.currentScore(evaluations)).toBe(4);
    });
  });

  it("Dado prazo informado, Quando criar, Então deadline é preservado; sem prazo, é null", () => {
    const deadline = new Date("2026-03-01");
    const withDeadline = CarePlanOutcome.create({
      carePlanId: "cp1",
      outcomeCode: "1101",
      baselineScore: 2,
      targetScore: 4,
      deadline,
    });
    const withoutDeadline = CarePlanOutcome.create({
      carePlanId: "cp1",
      outcomeCode: "1101",
      baselineScore: 2,
      targetScore: 4,
    });

    expect(withDeadline.deadline).toEqual(deadline);
    expect(withoutDeadline.deadline).toBeNull();
  });

  it("Dado carePlanId ou outcomeCode vazio, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      CarePlanOutcome.create({ carePlanId: " ", outcomeCode: "1101", baselineScore: 2, targetScore: 4 }),
    ).toThrow(ValidationError);
    expect(() =>
      CarePlanOutcome.create({ carePlanId: "cp1", outcomeCode: " ", baselineScore: 2, targetScore: 4 }),
    ).toThrow(ValidationError);
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const outcome = CarePlanOutcome.restore({
      id: "o1",
      carePlanId: "cp1",
      outcomeCode: "1101",
      baselineScore: 2,
      targetScore: 4,
      deadline: null,
      createdAt,
    });

    expect(outcome.id).toBe("o1");
    expect(outcome.createdAt).toEqual(createdAt);
  });
});

describe("Feature: Intervenção NIC prescrita (CarePlanIntervention)", () => {
  it("Dado dados válidos, Quando criar, Então intervenção prescrita com frequência e prioridade", () => {
    const intervention = CarePlanIntervention.create({
      carePlanId: "cp1",
      interventionCode: "3660",
      frequency: "A cada troca de placa",
      priority: "alta",
    });

    expect(intervention.frequency).toBe("A cada troca de placa");
    expect(intervention.priority).toBe("alta");
  });

  it("Dado frequência vazia, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      CarePlanIntervention.create({
        carePlanId: "cp1",
        interventionCode: "3660",
        frequency: "  ",
        priority: "media",
      }),
    ).toThrow(ValidationError);
  });

  it("Dado carePlanId ou interventionCode vazio, Quando criar, Então lança ValidationError", () => {
    expect(() =>
      CarePlanIntervention.create({
        carePlanId: " ",
        interventionCode: "3660",
        frequency: "Diária",
        priority: "baixa",
      }),
    ).toThrow(ValidationError);
    expect(() =>
      CarePlanIntervention.create({
        carePlanId: "cp1",
        interventionCode: " ",
        frequency: "Diária",
        priority: "baixa",
      }),
    ).toThrow(ValidationError);
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const intervention = CarePlanIntervention.restore({
      id: "i1",
      carePlanId: "cp1",
      interventionCode: "3660",
      frequency: "Diária",
      priority: "alta",
      createdAt,
    });

    expect(intervention.id).toBe("i1");
    expect(intervention.carePlanId).toBe("cp1");
    expect(intervention.interventionCode).toBe("3660");
    expect(intervention.createdAt).toEqual(createdAt);
  });
});

describe("Feature: Avaliação de resultado (OutcomeEvaluation) — append-only", () => {
  it("Dado pontuação válida, Quando criar, Então avaliação registrada com evaluatedAt", () => {
    const evaluation = OutcomeEvaluation.create({
      outcomeId: "o1",
      score: 4,
      professionalId: "prof1",
      notes: "Melhora visível da granulação",
    });

    expect(evaluation.score).toBe(4);
    expect(evaluation.evaluatedAt).toBeInstanceOf(Date);
  });

  it("Dado pontuação fora de 1–5, Quando criar, Então lança ValidationError", () => {
    expect(() => OutcomeEvaluation.create({ outcomeId: "o1", score: 0 })).toThrow(ValidationError);
    expect(() => OutcomeEvaluation.create({ outcomeId: "o1", score: 6 })).toThrow(ValidationError);
  });

  it("Dado outcomeId vazio, Quando criar, Então lança ValidationError", () => {
    expect(() => OutcomeEvaluation.create({ outcomeId: " ", score: 3 })).toThrow(ValidationError);
  });

  it("Dado uma avaliação criada, Quando criar outra, Então a primeira permanece inalterada", () => {
    const first = OutcomeEvaluation.create({ outcomeId: "o1", score: 2 });
    const second = OutcomeEvaluation.create({ outcomeId: "o1", score: 4 });

    expect(first.score).toBe(2);
    expect(second.score).toBe(4);
    expect(first.id).not.toBe(second.id);
  });

  it("Dado professionalId e notes omitidos, Quando criar, Então ambos são null", () => {
    const evaluation = OutcomeEvaluation.create({ outcomeId: "o1", score: 3 });

    expect(evaluation.professionalId).toBeNull();
    expect(evaluation.notes).toBeNull();
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos", () => {
    const evaluatedAt = new Date("2026-01-01T00:00:00Z");
    const evaluation = OutcomeEvaluation.restore({
      id: "e1",
      outcomeId: "o1",
      score: 4,
      professionalId: "prof1",
      notes: "nota",
      evaluatedAt,
    });

    expect(evaluation.id).toBe("e1");
    expect(evaluation.evaluatedAt).toEqual(evaluatedAt);
  });
});

describe("Feature: Execução de intervenção (InterventionRecord) — append-only", () => {
  it("Dado interventionId válido, Quando criar, Então registro criado com performedAt", () => {
    const record = InterventionRecord.create({ interventionId: "i1", professionalId: "prof1" });

    expect(record.interventionId).toBe("i1");
    expect(record.performedAt).toBeInstanceOf(Date);
  });

  it("Dado interventionId vazio, Quando criar, Então lança ValidationError", () => {
    expect(() => InterventionRecord.create({ interventionId: "  " })).toThrow(ValidationError);
  });

  it("Dado professionalId e notes omitidos, Quando criar, Então ambos são null", () => {
    const record = InterventionRecord.create({ interventionId: "i1" });

    expect(record.professionalId).toBeNull();
    expect(record.notes).toBeNull();
  });

  it("Dado restore, Quando reconstituir, Então mantém todos os campos", () => {
    const performedAt = new Date("2026-01-01T00:00:00Z");
    const record = InterventionRecord.restore({
      id: "r1",
      interventionId: "i1",
      professionalId: "prof1",
      notes: "nota",
      performedAt,
    });

    expect(record.id).toBe("r1");
    expect(record.performedAt).toEqual(performedAt);
  });
});

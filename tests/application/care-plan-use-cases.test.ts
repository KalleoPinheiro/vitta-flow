import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { InMemoryClinicalConditionRepository } from "@/infrastructure/persistence/in-memory/in-memory-clinical-repositories";
import {
  InMemoryNursingDiagnosisRepository,
  InMemoryNursingInterventionRepository,
  InMemoryNursingOutcomeRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-taxonomy-repositories";
import {
  InMemoryCarePlanDiagnosisRepository,
  InMemoryCarePlanInterventionRepository,
  InMemoryCarePlanOutcomeRepository,
  InMemoryCarePlanRepository,
  InMemoryInterventionRecordRepository,
  InMemoryOutcomeEvaluationRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-care-plan-repositories";
import { CreatePatient } from "@/application/patients/create-patient";
import { CreateCondition } from "@/application/clinical/create-condition";
import { OpenCarePlan } from "@/application/clinical/open-care-plan";
import { AddCarePlanDiagnosis } from "@/application/clinical/add-care-plan-diagnosis";
import { PrescribeOutcome } from "@/application/clinical/prescribe-outcome";
import { PrescribeIntervention } from "@/application/clinical/prescribe-intervention";
import { RecordIntervention } from "@/application/clinical/record-intervention";
import { EvaluateOutcome } from "@/application/clinical/evaluate-outcome";
import { ResolveCarePlan } from "@/application/clinical/resolve-care-plan";
import { ListCarePlansByPatient } from "@/application/clinical/list-care-plans-by-patient";
import { GetCarePlan } from "@/application/clinical/get-care-plan";
import { NursingDiagnosis } from "@/domain/taxonomy/nursing-diagnosis";
import { NursingOutcome } from "@/domain/taxonomy/nursing-outcome";
import { NursingIntervention } from "@/domain/taxonomy/nursing-intervention";
import type { Patient } from "@/domain/patient/patient";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

const scaleAnchors = [
  "Gravemente comprometido",
  "Substancialmente comprometido",
  "Moderadamente comprometido",
  "Levemente comprometido",
  "Não comprometido",
] as const;

describe("Feature: Plano de cuidados (SAE) — casos de uso", () => {
  let patientRepo: InMemoryPatientRepository;
  let conditionRepo: InMemoryClinicalConditionRepository;
  let carePlanRepo: InMemoryCarePlanRepository;
  let diagnosisRepo: InMemoryCarePlanDiagnosisRepository;
  let outcomeRepo: InMemoryCarePlanOutcomeRepository;
  let interventionRepo: InMemoryCarePlanInterventionRepository;
  let evaluationRepo: InMemoryOutcomeEvaluationRepository;
  let recordRepo: InMemoryInterventionRecordRepository;
  let diagnosisCatalog: InMemoryNursingDiagnosisRepository;
  let outcomeCatalog: InMemoryNursingOutcomeRepository;
  let interventionCatalog: InMemoryNursingInterventionRepository;
  let maria: Patient;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    conditionRepo = new InMemoryClinicalConditionRepository();
    carePlanRepo = new InMemoryCarePlanRepository();
    diagnosisRepo = new InMemoryCarePlanDiagnosisRepository();
    outcomeRepo = new InMemoryCarePlanOutcomeRepository();
    interventionRepo = new InMemoryCarePlanInterventionRepository();
    evaluationRepo = new InMemoryOutcomeEvaluationRepository();
    recordRepo = new InMemoryInterventionRecordRepository();
    diagnosisCatalog = new InMemoryNursingDiagnosisRepository();
    outcomeCatalog = new InMemoryNursingOutcomeRepository();
    interventionCatalog = new InMemoryNursingInterventionRepository();

    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });

    await diagnosisCatalog.save(
      NursingDiagnosis.create({
        code: "00046",
        label: "Integridade da pele prejudicada",
        domain: "Domínio 11",
        class: "Classe 2",
        edition: "NANDA-I 2021-2023",
      }),
    );
    await outcomeCatalog.save(
      NursingOutcome.create({
        code: "1101",
        label: "Integridade tissular: pele e mucosas",
        domain: "Saúde fisiológica",
        class: "Integridade tissular",
        edition: "NOC 6ª ed.",
        scaleAnchors,
      }),
    );
    await interventionCatalog.save(
      NursingIntervention.create({
        code: "3660",
        label: "Cuidados com lesões",
        domain: "Fisiológico: básico",
        class: "Controle de pele/lesão",
        edition: "NIC 7ª ed.",
      }),
    );
  });

  describe("Cenário: abrir plano de cuidados", () => {
    it("Dado paciente existente, Quando abrir plano, Então plano ativo persistido", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({
        patientId: maria.id,
      });

      expect(plan.status).toBe("active");
      expect(await carePlanRepo.findById(plan.id)).not.toBeNull();
    });

    it("Dado paciente inexistente, Quando abrir plano, Então lança NotFoundError", async () => {
      await expect(
        new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: "ghost" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: prescrever diagnóstico", () => {
    it("Dado plano ativo e código catalogado, Quando prescrever, Então diagnóstico salvo", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      const diagnosis = await new AddCarePlanDiagnosis(diagnosisRepo, carePlanRepo, diagnosisCatalog).execute({
        carePlanId: plan.id,
        diagnosisCode: "00046",
        type: "real",
        relatedFactors: "Umidade excessiva",
        definingCharacteristics: "Ruptura da epiderme",
      });

      expect(diagnosis.diagnosisCode).toBe("00046");
    });

    it("Dado plano inexistente, Quando prescrever diagnóstico, Então lança NotFoundError", async () => {
      await expect(
        new AddCarePlanDiagnosis(diagnosisRepo, carePlanRepo, diagnosisCatalog).execute({
          carePlanId: "ghost",
          diagnosisCode: "00046",
          type: "real",
          relatedFactors: "x",
          definingCharacteristics: "y",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("Dado plano resolvido, Quando prescrever diagnóstico, Então lança ValidationError", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });
      await new ResolveCarePlan(carePlanRepo).execute({ id: plan.id });

      await expect(
        new AddCarePlanDiagnosis(diagnosisRepo, carePlanRepo, diagnosisCatalog).execute({
          carePlanId: plan.id,
          diagnosisCode: "00046",
          type: "real",
          relatedFactors: "x",
          definingCharacteristics: "y",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("Dado código fora do catálogo, Quando prescrever diagnóstico, Então lança NotFoundError", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      await expect(
        new AddCarePlanDiagnosis(diagnosisRepo, carePlanRepo, diagnosisCatalog).execute({
          carePlanId: plan.id,
          diagnosisCode: "99999",
          type: "real",
          relatedFactors: "x",
          definingCharacteristics: "y",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: prescrever resultado NOC", () => {
    it("Dado plano ativo e código catalogado, Quando prescrever, Então resultado salvo", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      const outcome = await new PrescribeOutcome(outcomeRepo, carePlanRepo, outcomeCatalog).execute({
        carePlanId: plan.id,
        outcomeCode: "1101",
        baselineScore: 2,
        targetScore: 4,
      });

      expect(outcome.outcomeCode).toBe("1101");
    });

    it("Dado plano resolvido, Quando prescrever resultado, Então lança ValidationError", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });
      await new ResolveCarePlan(carePlanRepo).execute({ id: plan.id });

      await expect(
        new PrescribeOutcome(outcomeRepo, carePlanRepo, outcomeCatalog).execute({
          carePlanId: plan.id,
          outcomeCode: "1101",
          baselineScore: 2,
          targetScore: 4,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("Dado código fora do catálogo, Quando prescrever resultado, Então lança NotFoundError", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      await expect(
        new PrescribeOutcome(outcomeRepo, carePlanRepo, outcomeCatalog).execute({
          carePlanId: plan.id,
          outcomeCode: "9999",
          baselineScore: 2,
          targetScore: 4,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("Dado plano inexistente, Quando prescrever resultado, Então lança NotFoundError", async () => {
      await expect(
        new PrescribeOutcome(outcomeRepo, carePlanRepo, outcomeCatalog).execute({
          carePlanId: "ghost",
          outcomeCode: "1101",
          baselineScore: 2,
          targetScore: 4,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: prescrever intervenção NIC", () => {
    it("Dado plano ativo e código catalogado, Quando prescrever, Então intervenção salva", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      const intervention = await new PrescribeIntervention(
        interventionRepo,
        carePlanRepo,
        interventionCatalog,
      ).execute({
        carePlanId: plan.id,
        interventionCode: "3660",
        frequency: "A cada troca de placa",
        priority: "alta",
      });

      expect(intervention.interventionCode).toBe("3660");
    });

    it("Dado plano resolvido, Quando prescrever intervenção, Então lança ValidationError", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });
      await new ResolveCarePlan(carePlanRepo).execute({ id: plan.id });

      await expect(
        new PrescribeIntervention(interventionRepo, carePlanRepo, interventionCatalog).execute({
          carePlanId: plan.id,
          interventionCode: "3660",
          frequency: "Diária",
          priority: "media",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("Dado código fora do catálogo, Quando prescrever intervenção, Então lança NotFoundError", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      await expect(
        new PrescribeIntervention(interventionRepo, carePlanRepo, interventionCatalog).execute({
          carePlanId: plan.id,
          interventionCode: "9999",
          frequency: "Diária",
          priority: "media",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: registrar execução de intervenção", () => {
    it("Dado intervenção prescrita, Quando registrar execução, Então registro salvo", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });
      const intervention = await new PrescribeIntervention(
        interventionRepo,
        carePlanRepo,
        interventionCatalog,
      ).execute({
        carePlanId: plan.id,
        interventionCode: "3660",
        frequency: "Diária",
        priority: "alta",
      });

      const record = await new RecordIntervention(recordRepo, interventionRepo, carePlanRepo).execute({
        interventionId: intervention.id,
        professionalId: "prof1",
      });

      expect(record.interventionId).toBe(intervention.id);
    });

    it("Dado intervenção inexistente, Quando registrar execução, Então lança NotFoundError", async () => {
      await expect(
        new RecordIntervention(recordRepo, interventionRepo, carePlanRepo).execute({ interventionId: "ghost" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: avaliar resultado", () => {
    it("Dado resultado prescrito, Quando avaliar, Então avaliação salva", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });
      const outcome = await new PrescribeOutcome(outcomeRepo, carePlanRepo, outcomeCatalog).execute({
        carePlanId: plan.id,
        outcomeCode: "1101",
        baselineScore: 2,
        targetScore: 4,
      });

      const evaluation = await new EvaluateOutcome(evaluationRepo, outcomeRepo, carePlanRepo).execute({
        outcomeId: outcome.id,
        score: 3,
        professionalId: "prof1",
      });

      expect(evaluation.score).toBe(3);
    });

    it("Dado resultado inexistente, Quando avaliar, Então lança NotFoundError", async () => {
      await expect(
        new EvaluateOutcome(evaluationRepo, outcomeRepo, carePlanRepo).execute({ outcomeId: "ghost", score: 3 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: resolver e listar planos", () => {
    it("Dado plano ativo, Quando resolver, Então status muda para resolved", async () => {
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      const resolved = await new ResolveCarePlan(carePlanRepo).execute({ id: plan.id });

      expect(resolved.status).toBe("resolved");
    });

    it("Dado plano inexistente, Quando resolver, Então lança NotFoundError", async () => {
      await expect(new ResolveCarePlan(carePlanRepo).execute({ id: "ghost" })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("Dado múltiplos planos do paciente, Quando listar, Então retorna todos", async () => {
      await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });
      await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({ patientId: maria.id });

      const plans = await new ListCarePlansByPatient(carePlanRepo).execute({ patientId: maria.id });

      expect(plans).toHaveLength(2);
    });
  });

  describe("Cenário: montar visão completa do plano (GetCarePlan)", () => {
    it("Dado plano com diagnóstico, resultado avaliado e intervenção executada, Quando buscar, Então agrega tudo", async () => {
      const condition = await new CreateCondition(conditionRepo, patientRepo).execute({
        patientId: maria.id,
        kind: "wound",
        title: "Lesão sacral",
      });
      const plan = await new OpenCarePlan(carePlanRepo, patientRepo, conditionRepo).execute({
        patientId: maria.id,
        conditionId: condition.id,
      });
      await new AddCarePlanDiagnosis(diagnosisRepo, carePlanRepo, diagnosisCatalog).execute({
        carePlanId: plan.id,
        diagnosisCode: "00046",
        type: "real",
        relatedFactors: "Umidade excessiva",
        definingCharacteristics: "Ruptura da epiderme",
      });
      const outcome = await new PrescribeOutcome(outcomeRepo, carePlanRepo, outcomeCatalog).execute({
        carePlanId: plan.id,
        outcomeCode: "1101",
        baselineScore: 2,
        targetScore: 4,
      });
      const intervention = await new PrescribeIntervention(
        interventionRepo,
        carePlanRepo,
        interventionCatalog,
      ).execute({
        carePlanId: plan.id,
        interventionCode: "3660",
        frequency: "Diária",
        priority: "alta",
      });
      await new EvaluateOutcome(evaluationRepo, outcomeRepo, carePlanRepo).execute({ outcomeId: outcome.id, score: 3 });
      await new RecordIntervention(recordRepo, interventionRepo, carePlanRepo).execute({
        interventionId: intervention.id,
      });

      const detail = await new GetCarePlan(
        carePlanRepo,
        diagnosisRepo,
        outcomeRepo,
        interventionRepo,
        evaluationRepo,
        recordRepo,
      ).execute({ id: plan.id });

      expect(detail.plan.id).toBe(plan.id);
      expect(detail.diagnoses).toHaveLength(1);
      expect(detail.outcomes).toHaveLength(1);
      expect(detail.outcomes[0].evaluations).toHaveLength(1);
      expect(detail.outcomes[0].outcome.currentScore(detail.outcomes[0].evaluations)).toBe(3);
      expect(detail.interventions).toHaveLength(1);
      expect(detail.interventions[0].records).toHaveLength(1);
    });

    it("Dado plano inexistente, Quando buscar, Então lança NotFoundError", async () => {
      await expect(
        new GetCarePlan(
          carePlanRepo,
          diagnosisRepo,
          outcomeRepo,
          interventionRepo,
          evaluationRepo,
          recordRepo,
        ).execute({ id: "ghost" }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});

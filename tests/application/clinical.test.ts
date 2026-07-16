import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import {
  InMemoryAnamnesisRepository,
  InMemoryClinicalConditionRepository,
  InMemoryConditionAssessmentRepository,
  InMemoryEvolutionNoteRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-clinical-repositories";
import { CreatePatient } from "@/application/patients/create-patient";
import { UpsertAnamnesis } from "@/application/clinical/upsert-anamnesis";
import { GetAnamnesis } from "@/application/clinical/get-anamnesis";
import { AddEvolutionNote } from "@/application/clinical/add-evolution-note";
import { ListEvolutionNotes } from "@/application/clinical/list-evolution-notes";
import { CreateCondition } from "@/application/clinical/create-condition";
import { ResolveCondition } from "@/application/clinical/resolve-condition";
import { AddConditionAssessment } from "@/application/clinical/add-condition-assessment";
import { ListConditions } from "@/application/clinical/list-conditions";
import type { Patient } from "@/domain/patient/patient";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

describe("Feature: Prontuário clínico", () => {
  let patientRepo: InMemoryPatientRepository;
  let anamnesisRepo: InMemoryAnamnesisRepository;
  let evolutionRepo: InMemoryEvolutionNoteRepository;
  let conditionRepo: InMemoryClinicalConditionRepository;
  let assessmentRepo: InMemoryConditionAssessmentRepository;
  let maria: Patient;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    anamnesisRepo = new InMemoryAnamnesisRepository();
    evolutionRepo = new InMemoryEvolutionNoteRepository();
    conditionRepo = new InMemoryClinicalConditionRepository();
    assessmentRepo = new InMemoryConditionAssessmentRepository();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
  });

  describe("Cenário: anamnese", () => {
    it("Dado paciente sem anamnese, Quando salvar, Então cria; Quando salvar de novo, Então atualiza (upsert)", async () => {
      const useCase = new UpsertAnamnesis(anamnesisRepo, patientRepo);

      await useCase.execute({ patientId: maria.id, comorbidities: "DM2" });
      await useCase.execute({ patientId: maria.id, allergies: "Látex" });

      const stored = await new GetAnamnesis(anamnesisRepo).execute({ patientId: maria.id });
      expect(stored?.comorbidities).toBe("DM2");
      expect(stored?.allergies).toBe("Látex");
    });

    it("Dado paciente inexistente, Quando salvar anamnese, Então lança NotFoundError", async () => {
      await expect(
        new UpsertAnamnesis(anamnesisRepo, patientRepo).execute({ patientId: "ghost" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("Dado paciente sem anamnese, Quando buscar, Então retorna null", async () => {
      const result = await new GetAnamnesis(anamnesisRepo).execute({ patientId: maria.id });

      expect(result).toBeNull();
    });
  });

  describe("Cenário: evolução SOAP", () => {
    it("Dado paciente, Quando registrar evolução, Então persiste e lista em ordem cronológica reversa", async () => {
      const useCase = new AddEvolutionNote(evolutionRepo, patientRepo);
      await useCase.execute({ patientId: maria.id, subjective: "Primeira", objective: "", assessment: "", plan: "" });
      await useCase.execute({ patientId: maria.id, subjective: "Segunda", objective: "", assessment: "", plan: "" });

      const notes = await new ListEvolutionNotes(evolutionRepo).execute({ patientId: maria.id });

      expect(notes).toHaveLength(2);
      expect(notes[0].subjective).toBe("Segunda");
    });

    it("Dado paciente inexistente, Quando registrar evolução, Então lança NotFoundError", async () => {
      await expect(
        new AddEvolutionNote(evolutionRepo, patientRepo).execute({
          patientId: "ghost",
          subjective: "x",
          objective: "",
          assessment: "",
          plan: "",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: condições clínicas com avaliações", () => {
    it("Dado paciente, Quando criar estomia e avaliar, Então avaliação vinculada", async () => {
      const condition = await new CreateCondition(conditionRepo, patientRepo).execute({
        patientId: maria.id,
        kind: "stoma",
        title: "Colostomia terminal QIE",
        stomaType: "colostomia",
      });

      await new AddConditionAssessment(assessmentRepo, conditionRepo).execute({
        conditionId: condition.id,
        skinCondition: "Íntegra",
        painScale: 0,
      });

      const conditions = await new ListConditions(conditionRepo).execute({
        patientId: maria.id,
      });
      const assessments = await assessmentRepo.findByConditionId(condition.id);

      expect(conditions).toHaveLength(1);
      expect(assessments).toHaveLength(1);
      expect(assessments[0].skinCondition).toBe("Íntegra");
    });

    it("Dado condição resolvida, Quando avaliar, Então lança ValidationError", async () => {
      const condition = await new CreateCondition(conditionRepo, patientRepo).execute({
        patientId: maria.id,
        kind: "wound",
        title: "Úlcera venosa",
      });
      await new ResolveCondition(conditionRepo).execute({ id: condition.id });

      await expect(
        new AddConditionAssessment(assessmentRepo, conditionRepo).execute({
          conditionId: condition.id,
          lengthMm: 10,
          widthMm: 10,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("Dado condição inexistente, Quando avaliar ou resolver, Então lança NotFoundError", async () => {
      await expect(
        new AddConditionAssessment(assessmentRepo, conditionRepo).execute({
          conditionId: "ghost",
        }),
      ).rejects.toThrow(NotFoundError);
      await expect(new ResolveCondition(conditionRepo).execute({ id: "ghost" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});

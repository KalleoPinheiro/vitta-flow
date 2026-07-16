import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { CreatePatient } from "@/application/patients/create-patient";
import { UpdatePatient } from "@/application/patients/update-patient";
import { ListPatients } from "@/application/patients/list-patients";
import { GetPatient } from "@/application/patients/get-patient";
import { SetPatientActive } from "@/application/patients/set-patient-active";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

describe("Feature: Gestão de pacientes", () => {
  let repo: InMemoryPatientRepository;

  beforeEach(() => {
    repo = new InMemoryPatientRepository();
  });

  const createMaria = () =>
    new CreatePatient(repo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });

  describe("Cenário: cadastrar novo paciente", () => {
    it("Dado dados válidos, Quando cadastrar, Então paciente é persistido", async () => {
      const patient = await createMaria();

      const stored = await repo.findById(patient.id);
      expect(stored?.fullName).toBe("Maria da Silva");
    });

    it("Dado email já cadastrado, Quando cadastrar, Então lança ValidationError", async () => {
      await createMaria();

      await expect(
        new CreatePatient(repo).execute({
          fullName: "Outra Maria",
          email: "MARIA@example.com",
          phone: "11888880000",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Cenário: atualizar paciente", () => {
    it("Dado paciente existente, Quando atualizar telefone, Então dado é persistido", async () => {
      const patient = await createMaria();

      await new UpdatePatient(repo).execute({ id: patient.id, phone: "11777770000" });

      const stored = await repo.findById(patient.id);
      expect(stored?.phone).toBe("11777770000");
    });

    it("Dado id inexistente, Quando atualizar, Então lança NotFoundError", async () => {
      await expect(
        new UpdatePatient(repo).execute({ id: "ghost", phone: "1" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: buscar e listar pacientes", () => {
    it("Dado pacientes cadastrados, Quando listar com busca, Então filtra por nome", async () => {
      await createMaria();
      await new CreatePatient(repo).execute({
        fullName: "João Souza",
        email: "joao@example.com",
        phone: "11666660000",
      });

      const result = await new ListPatients(repo).execute({ search: "joão" });

      expect(result).toHaveLength(1);
      expect(result[0].fullName).toBe("João Souza");
    });

    it("Dado id existente, Quando buscar, Então retorna paciente", async () => {
      const patient = await createMaria();

      const found = await new GetPatient(repo).execute({ id: patient.id });

      expect(found.id).toBe(patient.id);
    });

    it("Dado id inexistente, Quando buscar, Então lança NotFoundError", async () => {
      await expect(new GetPatient(repo).execute({ id: "ghost" })).rejects.toThrow(NotFoundError);
    });
  });

  describe("Cenário: desativar paciente", () => {
    it("Dado paciente ativo, Quando desativar, Então persiste como inativo", async () => {
      const patient = await createMaria();

      await new SetPatientActive(repo).execute({ id: patient.id, active: false });

      const stored = await repo.findById(patient.id);
      expect(stored?.isActive).toBe(false);
    });
  });
});

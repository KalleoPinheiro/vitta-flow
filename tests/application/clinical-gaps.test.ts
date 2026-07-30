import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemoryClinicalConditionRepository,
  InMemoryConditionPhotoRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-clinical-repositories";
import { InMemoryPatientRepository } from "@/infrastructure/persistence/in-memory/in-memory-patient-repository";
import { CreatePatient } from "@/application/patients/create-patient";
import { CreateCondition } from "@/application/clinical/create-condition";
import { AddConditionPhoto } from "@/application/clinical/add-condition-photo";
import { DeleteConditionPhoto } from "@/application/clinical/delete-condition-photo";
import type { PhotoStorage } from "@/application/ports/photo-storage";
import { NotFoundError } from "@/domain/shared/errors";
import type { Patient } from "@/domain/patient/patient";

class FakePhotoStorage implements PhotoStorage {
  readonly files = new Map<string, Uint8Array>();
  failOnWrite = false;
  removedIds: string[] = [];

  async write(id: string, data: Uint8Array): Promise<void> {
    if (this.failOnWrite) {
      throw new Error("falha simulada de storage");
    }
    this.files.set(id, data);
  }

  async read(id: string): Promise<Uint8Array | null> {
    return this.files.get(id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.removedIds.push(id);
    this.files.delete(id);
  }
}

/** Repositório que lança ao salvar — usado para exercitar o rollback de arquivo órfão. */
class FailingConditionPhotoRepository extends InMemoryConditionPhotoRepository {
  async save(): Promise<void> {
    throw new Error("falha simulada ao gravar metadados");
  }
}

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

describe("Feature: Lacunas de cobertura — prontuário clínico e fotos", () => {
  let patientRepo: InMemoryPatientRepository;
  let conditionRepo: InMemoryClinicalConditionRepository;
  let photoRepo: InMemoryConditionPhotoRepository;
  let storage: FakePhotoStorage;
  let maria: Patient;

  beforeEach(async () => {
    patientRepo = new InMemoryPatientRepository();
    conditionRepo = new InMemoryClinicalConditionRepository();
    photoRepo = new InMemoryConditionPhotoRepository();
    storage = new FakePhotoStorage();
    maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
  });

  describe("Cenário: criar condição clínica", () => {
    it("Dado paciente inexistente, Quando criar condição, Então lança NotFoundError", async () => {
      await expect(
        new CreateCondition(conditionRepo, patientRepo).execute({
          patientId: "ghost",
          kind: "wound",
          title: "Úlcera venosa",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("Dado paciente existente, Quando criar condição, Então persiste vinculada a ele", async () => {
      const condition = await new CreateCondition(conditionRepo, patientRepo).execute({
        patientId: maria.id,
        kind: "wound",
        title: "Úlcera venosa",
      });

      expect((await conditionRepo.findById(condition.id))?.patientId).toBe(maria.id);
    });
  });

  describe("Cenário: excluir foto de condição", () => {
    it("Dado foto inexistente, Quando excluir, Então lança NotFoundError e não toca no storage", async () => {
      await expect(
        new DeleteConditionPhoto(photoRepo, storage).execute({ id: "ghost" }),
      ).rejects.toThrow(NotFoundError);
      expect(storage.removedIds).toHaveLength(0);
    });
  });

  describe("Cenário: enviar foto de condição — rollback em falha de metadados", () => {
    it("Dado falha ao salvar metadados, Quando enviar foto, Então remove o arquivo órfão e propaga o erro", async () => {
      const condition = await new CreateCondition(conditionRepo, patientRepo).execute({
        patientId: maria.id,
        kind: "wound",
        title: "Úlcera venosa",
      });
      const failingRepo = new FailingConditionPhotoRepository();

      await expect(
        new AddConditionPhoto(failingRepo, conditionRepo, storage).execute({
          conditionId: condition.id,
          data: JPEG_BYTES,
        }),
      ).rejects.toThrow("falha simulada ao gravar metadados");

      // Escreveu o arquivo antes de falhar e depois removeu — sem órfão no storage.
      expect(storage.files.size).toBe(0);
      expect(storage.removedIds).toHaveLength(1);
    });
  });
});

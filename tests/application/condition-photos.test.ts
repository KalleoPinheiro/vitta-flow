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
import { detectImageType, MAX_PHOTO_BYTES } from "@/domain/clinical/condition-photo";
import type { PhotoStorage } from "@/application/ports/photo-storage";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";
import type { ClinicalCondition } from "@/domain/clinical/clinical-condition";

class FakePhotoStorage implements PhotoStorage {
  readonly files = new Map<string, Uint8Array>();

  async write(id: string, data: Uint8Array): Promise<void> {
    this.files.set(id, data);
  }

  async read(id: string): Promise<Uint8Array | null> {
    return this.files.get(id) ?? null;
  }

  async remove(id: string): Promise<void> {
    this.files.delete(id);
  }
}

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TEXT_BYTES = new TextEncoder().encode("isto não é uma imagem");

describe("Feature: Fotos de evolução de ferida", () => {
  let photoRepo: InMemoryConditionPhotoRepository;
  let conditionRepo: InMemoryClinicalConditionRepository;
  let storage: FakePhotoStorage;
  let condition: ClinicalCondition;

  beforeEach(async () => {
    photoRepo = new InMemoryConditionPhotoRepository();
    conditionRepo = new InMemoryClinicalConditionRepository();
    storage = new FakePhotoStorage();
    const patientRepo = new InMemoryPatientRepository();
    const maria = await new CreatePatient(patientRepo).execute({
      fullName: "Maria da Silva",
      email: "maria@example.com",
      phone: "11999990000",
    });
    condition = await new CreateCondition(conditionRepo, patientRepo).execute({
      patientId: maria.id,
      kind: "wound",
      title: "Úlcera venosa MID",
      stomaType: null,
      startedAt: null,
      notes: null,
    });
  });

  const add = (data: Uint8Array, conditionId = condition.id) =>
    new AddConditionPhoto(photoRepo, conditionRepo, storage).execute({ conditionId, data });

  it("Dado JPEG válido, Quando enviar, Então salva metadados e arquivo", async () => {
    const photo = await add(JPEG_BYTES);

    expect(photo.contentType).toBe("image/jpeg");
    expect(storage.files.has(photo.id)).toBe(true);
    expect(await photoRepo.findByConditionId(condition.id)).toHaveLength(1);
  });

  it("Dado JPEG com EXIF, Quando enviar, Então grava arquivo sem APP1 e sizeBytes reflete o arquivo limpo (SEC1-05/08)", async () => {
    // SOI + APP1 "Exif" (9 bytes) + SOS + dados + EOI — sanitizer remove o APP1.
    const jpegWithExif = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x09, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x99,
      0xff, 0xda, 0x00, 0x02, 0xaa,
      0xff, 0xd9,
    ]);

    const photo = await add(jpegWithExif);
    const stored = storage.files.get(photo.id);

    expect(stored).toBeDefined();
    expect(Array.from(stored ?? [])).not.toContain(0xe1);
    expect(stored?.byteLength).toBe(jpegWithExif.byteLength - 11);
    expect(photo.sizeBytes).toBe(stored?.byteLength);
  });

  it("Dado arquivo que não é imagem, Quando enviar, Então ValidationError por magic bytes", async () => {
    await expect(add(TEXT_BYTES)).rejects.toThrow(ValidationError);
    expect(storage.files.size).toBe(0);
  });

  it("Dado arquivo acima de 5 MB, Quando enviar, Então ValidationError", async () => {
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set(JPEG_BYTES);
    await expect(add(big)).rejects.toThrow(ValidationError);
  });

  it("Dado condição inexistente, Quando enviar, Então NotFound", async () => {
    await expect(add(PNG_BYTES, "ghost")).rejects.toThrow(NotFoundError);
  });

  it("Dado foto existente, Quando excluir, Então remove metadados e arquivo", async () => {
    const photo = await add(PNG_BYTES);

    await new DeleteConditionPhoto(photoRepo, storage).execute({ id: photo.id });

    expect(await photoRepo.findById(photo.id)).toBeNull();
    expect(storage.files.has(photo.id)).toBe(false);
  });

  it("Detecção por magic bytes reconhece JPEG, PNG e WebP e rejeita o resto", () => {
    expect(detectImageType(JPEG_BYTES)).toBe("image/jpeg");
    expect(detectImageType(PNG_BYTES)).toBe("image/png");
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageType(webp)).toBe("image/webp");
    expect(detectImageType(TEXT_BYTES)).toBeNull();
  });
});

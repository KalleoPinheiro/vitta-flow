import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalPhotoStorage } from "@/infrastructure/storage/local-photo-storage";

describe("Feature: Storage local de fotos (disco)", () => {
  let tmpDir: string;
  let storage: LocalPhotoStorage;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), "vitta-flow-photos-"));
    storage = new LocalPhotoStorage(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("Cenário: gravar e ler arquivo", () => {
    it("Dado uma foto gravada, Quando ler pelo mesmo id, Então retorna os mesmos bytes", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      await storage.write("foto-1", data);
      const read = await storage.read("foto-1");

      expect(read ? Array.from(read) : null).toEqual(Array.from(data));
    });

    it("Dado id inexistente, Quando ler, Então retorna null em vez de lançar (ENOENT)", async () => {
      const read = await storage.read("nunca-gravado");

      expect(read).toBeNull();
    });
  });

  describe("Cenário: remover arquivo", () => {
    it("Dado uma foto gravada, Quando remover, Então some do storage", async () => {
      await storage.write("foto-2", new Uint8Array([9, 9, 9]));

      await storage.remove("foto-2");

      expect(await storage.read("foto-2")).toBeNull();
    });

    it("Dado id inexistente, Quando remover, Então não lança (force: true)", async () => {
      await expect(storage.remove("nunca-existiu")).resolves.toBeUndefined();
    });
  });

  describe("Cenário: defesa contra path traversal", () => {
    it("Dado id com caracteres fora do padrão, Quando write, Então lança erro", async () => {
      await expect(storage.write("../escape", new Uint8Array([1]))).rejects.toThrow(
        "Identificador de foto inválido",
      );
      await expect(storage.write("sub/dir", new Uint8Array([1]))).rejects.toThrow(
        "Identificador de foto inválido",
      );
    });

    it("Dado id com caracteres fora do padrão, Quando read, Então lança erro", async () => {
      await expect(storage.read("../escape")).rejects.toThrow("Identificador de foto inválido");
    });

    it("Dado id com caracteres fora do padrão, Quando remove, Então lança erro", async () => {
      await expect(storage.remove("../escape")).rejects.toThrow("Identificador de foto inválido");
    });

    it("Dado id válido (letras, números, underscore e hífen), Quando write, Então não lança", async () => {
      await expect(storage.write("Abc_123-XYZ", new Uint8Array([1]))).resolves.toBeUndefined();
    });
  });
});

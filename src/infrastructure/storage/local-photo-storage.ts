import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PhotoStorage } from "@/application/ports/photo-storage";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Storage local em disco (UPLOADS_DIR, default ./uploads) — volume no Docker.
 * Ids vêm do banco (UUID), mas o padrão é validado como defesa em profundidade
 * contra path traversal. Caminho namespaced por clinicId (MT-21) — uma sessão
 * de empresa B nunca resolve o caminho em disco de uma foto da empresa A.
 */
export class LocalPhotoStorage implements PhotoStorage {
  private readonly dir: string;

  constructor(
    baseDir: string = process.env.UPLOADS_DIR || "./uploads",
    clinicId: string = LEGACY_CLINIC_ID,
  ) {
    if (!ID_PATTERN.test(clinicId)) {
      throw new Error("Identificador de clínica inválido");
    }
    this.dir = path.resolve(baseDir, clinicId, "condition-photos");
  }

  private pathFor(id: string): string {
    if (!ID_PATTERN.test(id)) {
      throw new Error("Identificador de foto inválido");
    }
    return path.join(this.dir, id);
  }

  async write(id: string, data: Uint8Array): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(id), data);
  }

  async read(id: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.pathFor(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await rm(this.pathFor(id), { force: true });
  }
}

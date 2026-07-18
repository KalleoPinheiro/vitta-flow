/** Armazenamento binário de fotos — fora do diretório público. */
export interface PhotoStorage {
  write(id: string, data: Uint8Array): Promise<void>;
  read(id: string): Promise<Uint8Array | null>;
  remove(id: string): Promise<void>;
}

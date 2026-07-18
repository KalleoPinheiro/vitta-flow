import type { Procedure } from "./procedure";

export interface ProcedureRepository {
  save(procedure: Procedure): Promise<void>;
  findById(id: string): Promise<Procedure | null>;
  /** Busca por nome (case-insensitive) — unicidade do catálogo. */
  findByName(name: string): Promise<Procedure | null>;
  findAll(): Promise<Procedure[]>;
}

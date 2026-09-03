import { ValidationError } from "../shared/errors";

/** Item do kit padrão de um procedimento: insumo + quantidade consumida por atendimento. */
export interface ProcedureKitItem {
  supplyId: string;
  quantity: number;
}

export function validateKitItems(items: ProcedureKitItem[]): ProcedureKitItem[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.supplyId.trim()) {
      throw new ValidationError("Item do kit sem insumo");
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ValidationError("Quantidade do item do kit deve ser inteiro positivo");
    }
    if (seen.has(item.supplyId)) {
      throw new ValidationError("Insumo repetido no kit");
    }
    seen.add(item.supplyId);
  }
  return items;
}

export interface ProcedureKitRepository {
  getKit(procedureId: string): Promise<ProcedureKitItem[]>;
  /** Substitui o kit inteiro (lista vazia remove o kit). */
  setKit(procedureId: string, items: ProcedureKitItem[]): Promise<void>;
  /** Nº de itens de kit por procedimento — evita "Kit" opaco na listagem (PROC-03). */
  countByProcedure(): Promise<Record<string, number>>;
}

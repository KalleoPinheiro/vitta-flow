import type { StockMovement } from './stock-movement';
import type { Supply } from './supply';
import type { SupplyBatch } from './supply-batch';

export interface SupplyRepository {
  save(supply: Supply): Promise<void>;
  findById(id: string): Promise<Supply | null>;
  findAll(): Promise<Supply[]>;
  /**
   * Ajuste atômico condicional do estoque (CONS2-05): aplica o delta somente
   * se o resultado não ficar negativo. Retorna o insumo atualizado ou null
   * quando a condição falha (insuficiente ou id inexistente) — elimina a
   * corrida entre checagem e baixa do read-modify-write.
   */
  adjustStock(id: string, delta: number): Promise<Supply | null>;
}

/** Custo de saídas agregado por consulta (null = saída não vinculada a atendimento). */
export interface OutflowCostByAppointment {
  appointmentId: string | null;
  totalCents: number;
}

/** Total de saídas por insumo no período — base da previsão de ruptura. */
export interface OutflowBySupply {
  supplyId: string;
  totalQty: number;
}

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<void>;
  findBySupplyId(supplyId: string): Promise<StockMovement[]>;
  findByAppointmentId(appointmentId: string): Promise<StockMovement[]>;
  /** Soma quantity × unit_price_cents das saídas no período, agrupada por consulta. */
  getOutflowCostInRange(
    from: Date,
    to: Date,
  ): Promise<OutflowCostByAppointment[]>;
  /** Quantidade total de saídas por insumo no período. */
  getOutflowQtyInRange(from: Date, to: Date): Promise<OutflowBySupply[]>;
}

export interface SupplyBatchRepository {
  save(batch: SupplyBatch): Promise<void>;
  /** Lotes com saldo, ordenados por validade mais próxima (FEFO; sem validade por último). */
  findActiveBySupplyId(supplyId: string): Promise<SupplyBatch[]>;
  /** Lotes com saldo e validade até a data-limite (vencidos inclusos). */
  findExpiringBefore(limit: Date): Promise<SupplyBatch[]>;
}

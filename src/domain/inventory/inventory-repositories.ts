import type { Supply } from "./supply";
import type { StockMovement } from "./stock-movement";

export interface SupplyRepository {
  save(supply: Supply): Promise<void>;
  findById(id: string): Promise<Supply | null>;
  findAll(): Promise<Supply[]>;
}

/** Custo de saídas agregado por consulta (null = saída não vinculada a atendimento). */
export interface OutflowCostByAppointment {
  appointmentId: string | null;
  totalCents: number;
}

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<void>;
  findBySupplyId(supplyId: string): Promise<StockMovement[]>;
  /** Soma quantity × unit_price_cents das saídas no período, agrupada por consulta. */
  getOutflowCostInRange(from: Date, to: Date): Promise<OutflowCostByAppointment[]>;
}

import type { Supply } from "./supply";
import type { StockMovement } from "./stock-movement";

export interface SupplyRepository {
  save(supply: Supply): Promise<void>;
  findById(id: string): Promise<Supply | null>;
  findAll(): Promise<Supply[]>;
}

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<void>;
  findBySupplyId(supplyId: string): Promise<StockMovement[]>;
}

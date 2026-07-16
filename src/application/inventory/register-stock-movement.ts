import { StockMovement, type MovementType } from "@/domain/inventory/stock-movement";
import type {
  StockMovementRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import type { Supply } from "@/domain/inventory/supply";
import { NotFoundError } from "@/domain/shared/errors";

export interface RegisterStockMovementInput {
  supplyId: string;
  type: MovementType;
  quantity: number;
  reason: string;
}

export class RegisterStockMovement {
  constructor(
    private readonly supplies: SupplyRepository,
    private readonly movements: StockMovementRepository,
  ) {}

  async execute(input: RegisterStockMovementInput): Promise<Supply> {
    const supply = await this.supplies.findById(input.supplyId);
    if (!supply) {
      throw new NotFoundError("Insumo", input.supplyId);
    }

    const updated =
      input.type === "in"
        ? supply.registerEntry(input.quantity)
        : supply.registerExit(input.quantity);
    const movement = StockMovement.create(input);

    await this.supplies.save(updated);
    await this.movements.save(movement);
    return updated;
  }
}

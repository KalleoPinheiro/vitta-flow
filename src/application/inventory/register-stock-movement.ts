import { StockMovement, type MovementType } from "@/domain/inventory/stock-movement";
import type {
  StockMovementRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { Supply } from "@/domain/inventory/supply";
import { NotFoundError } from "@/domain/shared/errors";

export interface RegisterStockMovementInput {
  supplyId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  /** Consulta atendida com o material (opcional; só para saídas). */
  appointmentId?: string | null;
}

export class RegisterStockMovement {
  constructor(
    private readonly supplies: SupplyRepository,
    private readonly movements: StockMovementRepository,
    private readonly appointments?: AppointmentRepository,
  ) {}

  async execute(input: RegisterStockMovementInput): Promise<Supply> {
    const supply = await this.supplies.findById(input.supplyId);
    if (!supply) {
      throw new NotFoundError("Insumo", input.supplyId);
    }

    const appointmentId = input.type === "out" ? (input.appointmentId ?? null) : null;
    if (appointmentId) {
      const appointment = await this.appointments?.findById(appointmentId);
      if (!appointment) {
        throw new NotFoundError("Consulta", appointmentId);
      }
    }

    const updated =
      input.type === "in"
        ? supply.registerEntry(input.quantity)
        : supply.registerExit(input.quantity);
    const movement = StockMovement.create({
      supplyId: input.supplyId,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      appointmentId,
      // Congela o custo da saída no preço vigente do insumo.
      unitPriceCents: input.type === "out" ? supply.priceCents : null,
    });

    await this.supplies.save(updated);
    await this.movements.save(movement);
    return updated;
  }
}

import { StockMovement, type MovementType } from "@/domain/inventory/stock-movement";
import { SupplyBatch } from "@/domain/inventory/supply-batch";
import type {
  StockMovementRepository,
  SupplyBatchRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { Supply } from "@/domain/inventory/supply";
import { InsufficientStockError, NotFoundError } from "@/domain/shared/errors";

export interface RegisterStockMovementInput {
  supplyId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  /** Consulta atendida com o material (opcional; só para saídas). */
  appointmentId?: string | null;
  /** Lote do fornecedor (opcional; só para entradas). */
  batchLabel?: string | null;
  /** Validade do lote (opcional; só para entradas). */
  expiresAt?: Date | null;
}

export class RegisterStockMovement {
  constructor(
    private readonly supplies: SupplyRepository,
    private readonly movements: StockMovementRepository,
    private readonly appointments?: AppointmentRepository,
    private readonly batches?: SupplyBatchRepository,
  ) {}

  async execute(input: RegisterStockMovementInput): Promise<Supply> {
    const supply = await this.supplies.findById(input.supplyId);
    if (!supply) {
      throw new NotFoundError("Insumo", input.supplyId);
    }

    const appointmentId = input.type === "out" ? (input.appointmentId ?? null) : null;
    // Valida o vínculo apenas quando o repositório de consultas foi fornecido.
    if (appointmentId && this.appointments) {
      const appointment = await this.appointments.findById(appointmentId);
      if (!appointment) {
        throw new NotFoundError("Consulta", appointmentId);
      }
    }

    assertMovementAllowed(supply, input.type, input.quantity);
    const movement = StockMovement.create({
      supplyId: input.supplyId,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      appointmentId,
      // Congela o custo da saída no preço vigente do insumo.
      unitPriceCents: input.type === "out" ? supply.priceCents : null,
    });

    // Aplicação atômica (CONS2-05): a condição é re-checada no banco — corrida
    // entre o findById acima e a baixa não deixa estoque negativo (CONS2-08).
    const delta = input.type === "in" ? input.quantity : -input.quantity;
    const updated = await this.supplies.adjustStock(supply.id, delta);
    if (!updated) {
      throw new InsufficientStockError(
        `Estoque insuficiente de "${supply.name}": disponível ${supply.stockQty}, solicitado ${input.quantity}`,
      );
    }
    await this.movements.save(movement);
    await this.syncBatches(input);
    return updated;
  }

  /**
   * Lotes são camada informativa (validade/FEFO); o estoque do insumo segue
   * sendo a fonte de verdade. Entrada sem lote não cria lote (retrocompatível);
   * saída consome dos lotes com validade mais próxima até onde houver saldo.
   */
  private async syncBatches(input: RegisterStockMovementInput): Promise<void> {
    if (!this.batches) {
      return;
    }
    if (input.type === "in") {
      if (input.batchLabel || input.expiresAt) {
        await this.batches.save(
          SupplyBatch.create({
            supplyId: input.supplyId,
            quantity: input.quantity,
            label: input.batchLabel ?? null,
            expiresAt: input.expiresAt ?? null,
          }),
        );
      }
      return;
    }

    let toConsume = input.quantity;
    for (const batch of await this.batches.findActiveBySupplyId(input.supplyId)) {
      if (toConsume <= 0) break;
      const { batch: consumed, leftover } = batch.consume(toConsume);
      await this.batches.save(consumed);
      toConsume = leftover;
    }
  }
}

/**
 * Valida a movimentação no snapshot lido — mensagens do domínio preservadas
 * (quantidade positiva; estoque suficiente). A condição definitiva é aplicada
 * no banco por `adjustStock` (anti-corrida).
 */
function assertMovementAllowed(supply: Supply, type: MovementType, quantity: number): void {
  if (type === "in") {
    supply.registerEntry(quantity);
  } else {
    supply.registerExit(quantity);
  }
}

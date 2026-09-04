import type { ProcedureKitRepository } from '@/domain/catalog/procedure-kit';
import type {
  StockMovementRepository,
  SupplyRepository,
} from '@/domain/inventory/inventory-repositories';
import type { RegisterStockMovement } from './register-stock-movement';

export const KIT_REASON = 'Kit do procedimento';

export interface DispenseKitResult {
  dispensed: number;
  /** Itens não baixados (estoque insuficiente ou insumo inativo) — nunca bloqueiam a conclusão. */
  warnings: string[];
  skipped: boolean;
}

/**
 * Baixa automática do kit ao concluir consulta (O2.4).
 * Idempotente: se a consulta já tem saída de kit, não baixa de novo (conclusão
 * reparadora re-executa sem duplicar). Tudo-ou-nada POR ITEM: item sem estoque
 * gera aviso e os demais seguem.
 */
export class DispenseProcedureKit {
  constructor(
    private readonly kits: ProcedureKitRepository,
    private readonly supplies: SupplyRepository,
    private readonly movements: StockMovementRepository,
    private readonly register: RegisterStockMovement,
  ) {}

  async execute(input: {
    appointmentId: string;
    procedureId: string;
  }): Promise<DispenseKitResult> {
    const kit = await this.kits.getKit(input.procedureId);
    if (kit.length === 0) {
      return { dispensed: 0, warnings: [], skipped: false };
    }

    const existing = await this.movements.findByAppointmentId(
      input.appointmentId,
    );
    if (existing.some((movement) => movement.reason === KIT_REASON)) {
      return { dispensed: 0, warnings: [], skipped: true };
    }

    const result: DispenseKitResult = {
      dispensed: 0,
      warnings: [],
      skipped: false,
    };
    for (const item of kit) {
      const supply = await this.supplies.findById(item.supplyId);
      if (!supply?.isActive) {
        result.warnings.push(`Insumo do kit indisponível (${item.supplyId})`);
        continue;
      }
      if (supply.stockQty < item.quantity) {
        result.warnings.push(
          `Estoque insuficiente de ${supply.name}: precisa ${item.quantity}, há ${supply.stockQty}`,
        );
        continue;
      }
      await this.register.execute({
        supplyId: item.supplyId,
        type: 'out',
        quantity: item.quantity,
        reason: KIT_REASON,
        appointmentId: input.appointmentId,
      });
      result.dispensed += 1;
    }
    return result;
  }
}

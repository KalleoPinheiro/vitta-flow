import type {
  StockMovementRepository,
  SupplyBatchRepository,
  SupplyRepository,
} from '@/domain/inventory/inventory-repositories';

export interface ExpiringBatchInfo {
  batchId: string;
  supplyId: string;
  supplyName: string;
  label: string | null;
  expiresAt: Date;
  remaining: number;
  isExpired: boolean;
}

export interface SupplyInsight {
  supplyId: string;
  /** Consumo médio diário na janela (saídas ÷ dias). */
  avgDailyOut: number;
  /** Dias até zerar no ritmo atual; null sem consumo na janela. */
  daysToStockout: number | null;
}

export interface SupplyInsights {
  bySupply: SupplyInsight[];
  expiringBatches: ExpiringBatchInfo[];
}

const CONSUMPTION_WINDOW_DAYS = 90;
const EXPIRY_ALERT_DAYS = 30;
const MS_PER_DAY = 86_400_000;

/** Previsão de ruptura (consumo médio 90d) e lotes vencendo em ≤ 30 dias. */
export class GetSupplyInsights {
  constructor(
    private readonly supplies: SupplyRepository,
    private readonly movements: StockMovementRepository,
    private readonly batches?: SupplyBatchRepository,
  ) {}

  async execute(now: Date = new Date()): Promise<SupplyInsights> {
    const windowStart = new Date(
      now.getTime() - CONSUMPTION_WINDOW_DAYS * MS_PER_DAY,
    );
    // Range [from, to) — +1ms inclui movimentos registrados no mesmo instante.
    const windowEnd = new Date(now.getTime() + 1);
    const expiryLimit = new Date(
      now.getTime() + EXPIRY_ALERT_DAYS * MS_PER_DAY,
    );

    const [supplies, outflows, expiring] = await Promise.all([
      this.supplies.findAll(),
      this.movements.getOutflowQtyInRange(windowStart, windowEnd),
      this.batches?.findExpiringBefore(expiryLimit) ?? Promise.resolve([]),
    ]);

    const stockById = new Map(supplies.map((s) => [s.id, s]));
    const bySupply: SupplyInsight[] = outflows.map(({ supplyId, totalQty }) => {
      const avgDailyOut = totalQty / CONSUMPTION_WINDOW_DAYS;
      const stockQty = stockById.get(supplyId)?.stockQty ?? 0;
      return {
        supplyId,
        avgDailyOut,
        daysToStockout:
          avgDailyOut > 0 ? Math.floor(stockQty / avgDailyOut) : null,
      };
    });

    const expiringBatches: ExpiringBatchInfo[] = expiring
      .filter((batch) => batch.expiresAt != null)
      .map((batch) => ({
        batchId: batch.id,
        supplyId: batch.supplyId,
        supplyName: stockById.get(batch.supplyId)?.name ?? batch.supplyId,
        label: batch.label,
        expiresAt: batch.expiresAt as Date,
        remaining: batch.remaining,
        isExpired: batch.isExpired(now),
      }));

    return { bySupply, expiringBatches };
  }
}

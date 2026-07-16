import type { Supply } from "@/domain/inventory/supply";
import type { StockMovement } from "@/domain/inventory/stock-movement";
import type {
  StockMovementRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import type { FollowUp } from "@/domain/followup/follow-up";
import type {
  FollowUpFilter,
  FollowUpRepository,
} from "@/domain/followup/follow-up-repository";

export class InMemorySupplyRepository implements SupplyRepository {
  private readonly items = new Map<string, Supply>();

  async save(supply: Supply): Promise<void> {
    this.items.set(supply.id, supply);
  }

  async findById(id: string): Promise<Supply | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(): Promise<Supply[]> {
    return [...this.items.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export class InMemoryStockMovementRepository implements StockMovementRepository {
  private readonly items = new Map<string, StockMovement>();

  async save(movement: StockMovement): Promise<void> {
    this.items.set(movement.id, movement);
  }

  async findBySupplyId(supplyId: string): Promise<StockMovement[]> {
    return [...this.items.values()]
      .filter((m) => m.supplyId === supplyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export class InMemoryFollowUpRepository implements FollowUpRepository {
  private readonly items = new Map<string, FollowUp>();

  async save(followUp: FollowUp): Promise<void> {
    this.items.set(followUp.id, followUp);
  }

  async findById(id: string): Promise<FollowUp | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(filter?: FollowUpFilter): Promise<FollowUp[]> {
    return [...this.items.values()]
      .filter((f) => {
        if (filter?.status && f.status !== filter.status) return false;
        if (filter?.patientId && f.patientId !== filter.patientId) return false;
        if (filter?.dueBefore && f.dueDate.getTime() >= filter.dueBefore.getTime()) return false;
        return true;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
}

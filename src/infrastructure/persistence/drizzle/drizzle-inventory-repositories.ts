import { and, asc, desc, eq, lt, type SQL } from "drizzle-orm";
import { Supply } from "@/domain/inventory/supply";
import { StockMovement, type MovementType } from "@/domain/inventory/stock-movement";
import type {
  StockMovementRepository,
  SupplyRepository,
} from "@/domain/inventory/inventory-repositories";
import { FollowUp, type FollowUpStatus } from "@/domain/followup/follow-up";
import type {
  FollowUpFilter,
  FollowUpRepository,
} from "@/domain/followup/follow-up-repository";
import type { AppDb } from "./db";
import { followUps, stockMovements, supplies } from "./schema";

export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(private readonly db: AppDb) {}

  async save(supply: Supply): Promise<void> {
    const values = {
      id: supply.id,
      name: supply.name,
      unit: supply.unit,
      minQty: supply.minQty,
      priceCents: supply.priceCents,
      stockQty: supply.stockQty,
      active: supply.isActive,
      createdAt: supply.createdAt,
    };
    await this.db
      .insert(supplies)
      .values(values)
      .onConflictDoUpdate({ target: supplies.id, set: values });
  }

  async findById(id: string): Promise<Supply | null> {
    const rows = await this.db.select().from(supplies).where(eq(supplies.id, id)).limit(1);
    return rows[0] ? Supply.restore(rows[0]) : null;
  }

  async findAll(): Promise<Supply[]> {
    const rows = await this.db.select().from(supplies).orderBy(asc(supplies.name));
    return rows.map((row) => Supply.restore(row));
  }
}

export class DrizzleStockMovementRepository implements StockMovementRepository {
  constructor(private readonly db: AppDb) {}

  async save(movement: StockMovement): Promise<void> {
    await this.db.insert(stockMovements).values({
      id: movement.id,
      supplyId: movement.supplyId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      createdAt: movement.createdAt,
    });
  }

  async findBySupplyId(supplyId: string): Promise<StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.supplyId, supplyId))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id));
    return rows.map((row) => StockMovement.restore({ ...row, type: row.type as MovementType }));
  }
}

export class DrizzleFollowUpRepository implements FollowUpRepository {
  constructor(private readonly db: AppDb) {}

  private toEntity(row: typeof followUps.$inferSelect): FollowUp {
    return FollowUp.restore({ ...row, status: row.status as FollowUpStatus });
  }

  async save(followUp: FollowUp): Promise<void> {
    const values = {
      id: followUp.id,
      patientId: followUp.patientId,
      appointmentId: followUp.appointmentId,
      dueDate: followUp.dueDate,
      reason: followUp.reason,
      status: followUp.status,
      createdAt: followUp.createdAt,
    };
    await this.db
      .insert(followUps)
      .values(values)
      .onConflictDoUpdate({ target: followUps.id, set: values });
  }

  async findById(id: string): Promise<FollowUp | null> {
    const rows = await this.db.select().from(followUps).where(eq(followUps.id, id)).limit(1);
    return rows[0] ? this.toEntity(rows[0]) : null;
  }

  async findAll(filter: FollowUpFilter = {}): Promise<FollowUp[]> {
    const conditions: SQL[] = [];
    if (filter.status) conditions.push(eq(followUps.status, filter.status));
    if (filter.patientId) conditions.push(eq(followUps.patientId, filter.patientId));
    if (filter.dueBefore) conditions.push(lt(followUps.dueDate, filter.dueBefore));

    const rows = await this.db
      .select()
      .from(followUps)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(followUps.dueDate));
    return rows.map((row) => this.toEntity(row));
  }
}

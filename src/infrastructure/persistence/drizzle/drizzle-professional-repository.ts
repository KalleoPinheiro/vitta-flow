import { asc, eq, inArray } from "drizzle-orm";
import { Professional } from "@/domain/professional/professional";
import type { ProfessionalRepository } from "@/domain/professional/professional-repository";
import { MAX_ROWS, type AppDb } from "./db";
import { LEGACY_CLINIC_ID } from "./legacy-clinic";
import { professionals } from "./schema";

export class DrizzleProfessionalRepository implements ProfessionalRepository {
  constructor(private readonly db: AppDb) {}

  async save(professional: Professional): Promise<void> {
    const values = {
      id: professional.id,
      clinicId: LEGACY_CLINIC_ID,
      fullName: professional.fullName,
      registry: professional.registry,
      commissionPct: professional.commissionPct,
      active: professional.isActive,
      createdAt: professional.createdAt,
    };
    await this.db
      .insert(professionals)
      .values(values)
      .onConflictDoUpdate({ target: professionals.id, set: values });
  }

  async findById(id: string): Promise<Professional | null> {
    const rows = await this.db
      .select()
      .from(professionals)
      .where(eq(professionals.id, id))
      .limit(1);
    return rows[0] ? Professional.restore(rows[0]) : null;
  }

  async findByIds(ids: string[]): Promise<Professional[]> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(professionals)
      .where(inArray(professionals.id, unique));
    return rows.map((row) => Professional.restore(row));
  }

  async findAll(): Promise<Professional[]> {
    const rows = await this.db
      .select()
      .from(professionals)
      .orderBy(asc(professionals.fullName))
      .limit(MAX_ROWS);
    return rows.map((row) => Professional.restore(row));
  }
}

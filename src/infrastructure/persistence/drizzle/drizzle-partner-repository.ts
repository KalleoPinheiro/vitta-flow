import { asc, eq } from "drizzle-orm";
import { Partner } from "@/domain/partner/partner";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import { MAX_ROWS, type AppDb } from "./db";
import { partners } from "./schema";
import { withTenant } from "./tenant-scope";

const toPartner = (row: typeof partners.$inferSelect): Partner => Partner.restore(row);

export class DrizzlePartnerRepository implements PartnerRepository {
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async save(partner: Partner): Promise<void> {
    if (this.clinicId === null) {
      throw new Error("Papel de sistema não pode salvar parceiro (somente leitura cross-empresa)");
    }
    const values = {
      id: partner.id,
      clinicId: this.clinicId,
      fullName: partner.fullName,
      email: partner.email,
      phone: partner.phone,
      crm: partner.crm,
      specialty: partner.specialty,
      active: partner.isActive,
      createdAt: partner.createdAt,
    };
    await this.db
      .insert(partners)
      .values(values)
      .onConflictDoUpdate({ target: partners.id, set: values });
  }

  async findById(id: string): Promise<Partner | null> {
    const rows = await this.db
      .select()
      .from(partners)
      .where(withTenant(partners, this.clinicId, eq(partners.id, id)))
      .limit(1);
    return rows[0] ? toPartner(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Partner | null> {
    const rows = await this.db
      .select()
      .from(partners)
      .where(withTenant(partners, this.clinicId, eq(partners.email, email.trim().toLowerCase())))
      .limit(1);
    return rows[0] ? toPartner(rows[0]) : null;
  }

  async findAll(): Promise<Partner[]> {
    const rows = await this.db
      .select()
      .from(partners)
      .where(withTenant(partners, this.clinicId))
      .orderBy(asc(partners.fullName))
      .limit(MAX_ROWS);
    return rows.map(toPartner);
  }
}

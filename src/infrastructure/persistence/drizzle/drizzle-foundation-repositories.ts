import { asc, eq, sql } from "drizzle-orm";
import { Procedure } from "@/domain/catalog/procedure";
import type { ProcedureRepository } from "@/domain/catalog/procedure-repository";
import { UserAccount, type UserAccountRepository } from "@/domain/auth/user-account";
import {
  validateScheduleConfig,
  type ScheduleConfig,
  type ScheduleConfigRepository,
} from "@/domain/scheduling/schedule-config";
import {
  validateKitItems,
  type ProcedureKitItem,
  type ProcedureKitRepository,
} from "@/domain/catalog/procedure-kit";
import { newId } from "@/domain/shared/id";
import { MAX_ROWS, type AppDb } from "./db";
import { procedureSupplies, procedures, scheduleSettings, userAccounts } from "./schema";
import { withTenant } from "./tenant-scope";

export class DrizzleProcedureRepository implements ProcedureRepository {
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async save(procedure: Procedure): Promise<void> {
    if (this.clinicId === null) {
      throw new Error(
        "Papel de sistema não pode salvar procedimento (somente leitura cross-empresa)",
      );
    }
    const values = {
      id: procedure.id,
      clinicId: this.clinicId,
      name: procedure.name,
      priceCents: procedure.priceCents,
      durationMinutes: procedure.durationMinutes,
      active: procedure.isActive,
      createdAt: procedure.createdAt,
    };
    await this.db
      .insert(procedures)
      .values(values)
      .onConflictDoUpdate({ target: procedures.id, set: values });
  }

  async findById(id: string): Promise<Procedure | null> {
    const rows = await this.db
      .select()
      .from(procedures)
      .where(withTenant(procedures, this.clinicId, eq(procedures.id, id)))
      .limit(1);
    return rows[0] ? Procedure.restore(rows[0]) : null;
  }

  async findByName(name: string): Promise<Procedure | null> {
    const rows = await this.db
      .select()
      .from(procedures)
      .where(
        withTenant(
          procedures,
          this.clinicId,
          sql`lower(${procedures.name}) = lower(${name.trim()})`,
        ),
      )
      .limit(1);
    return rows[0] ? Procedure.restore(rows[0]) : null;
  }

  async findAll(): Promise<Procedure[]> {
    const rows = await this.db
      .select()
      .from(procedures)
      .where(withTenant(procedures, this.clinicId))
      .orderBy(asc(procedures.name))
      .limit(MAX_ROWS);
    return rows.map((row) => Procedure.restore(row));
  }
}

export class DrizzleUserAccountRepository implements UserAccountRepository {
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async save(account: UserAccount): Promise<void> {
    if (this.clinicId === null) {
      throw new Error(
        "Papel de sistema não pode salvar conta de usuário (somente leitura cross-empresa)",
      );
    }
    const values = {
      id: account.id,
      clinicId: this.clinicId,
      email: account.email,
      passwordHash: account.passwordHash,
      role: account.role,
      professionalId: account.professionalId,
      active: account.isActive,
      createdAt: account.createdAt,
    };
    await this.db
      .insert(userAccounts)
      .values(values)
      .onConflictDoUpdate({ target: userAccounts.id, set: values });
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const rows = await this.db
      .select()
      .from(userAccounts)
      .where(
        withTenant(userAccounts, this.clinicId, eq(userAccounts.email, email.trim().toLowerCase())),
      )
      .limit(1);
    return rows[0] ? UserAccount.restore(rows[0]) : null;
  }

  async findAll(): Promise<UserAccount[]> {
    const rows = await this.db
      .select()
      .from(userAccounts)
      .where(withTenant(userAccounts, this.clinicId))
      .orderBy(asc(userAccounts.email))
      .limit(MAX_ROWS);
    return rows.map((row) => UserAccount.restore(row));
  }
}

export class DrizzleScheduleConfigRepository implements ScheduleConfigRepository {
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  async get(): Promise<ScheduleConfig | null> {
    if (this.clinicId === null) {
      return null;
    }
    const rows = await this.db
      .select()
      .from(scheduleSettings)
      .where(eq(scheduleSettings.clinicId, this.clinicId))
      .limit(1);
    if (!rows[0]) {
      return null;
    }
    try {
      return validateScheduleConfig({
        weekdays: JSON.parse(rows[0].weekdays) as number[],
        startHour: rows[0].startHour,
        endHour: rows[0].endHour,
        minGapMinutes: rows[0].minGapMinutes,
      });
    } catch {
      // Configuração corrompida nunca derruba o agendamento — cai no default.
      return null;
    }
  }

  async save(config: ScheduleConfig): Promise<void> {
    if (this.clinicId === null) {
      throw new Error(
        "Papel de sistema não pode salvar configuração de horário (somente leitura cross-empresa)",
      );
    }
    const validated = validateScheduleConfig(config);
    const values = {
      id: newId(),
      clinicId: this.clinicId,
      weekdays: JSON.stringify(validated.weekdays),
      startHour: validated.startHour,
      endHour: validated.endHour,
      minGapMinutes: validated.minGapMinutes,
      updatedAt: new Date(),
    };
    await this.db
      .insert(scheduleSettings)
      .values(values)
      .onConflictDoUpdate({
        target: scheduleSettings.clinicId,
        set: {
          weekdays: values.weekdays,
          startHour: values.startHour,
          endHour: values.endHour,
          minGapMinutes: values.minGapMinutes,
          updatedAt: values.updatedAt,
        },
      });
  }
}

export class DrizzleProcedureKitRepository implements ProcedureKitRepository {
  constructor(private readonly db: AppDb) {}

  async getKit(procedureId: string): Promise<ProcedureKitItem[]> {
    const rows = await this.db
      .select()
      .from(procedureSupplies)
      .where(eq(procedureSupplies.procedureId, procedureId));
    return rows.map((row) => ({ supplyId: row.supplyId, quantity: row.quantity }));
  }

  async setKit(procedureId: string, items: ProcedureKitItem[]): Promise<void> {
    const validated = validateKitItems(items);
    await this.db.transaction(async (tx) => {
      await tx.delete(procedureSupplies).where(eq(procedureSupplies.procedureId, procedureId));
      if (validated.length > 0) {
        await tx.insert(procedureSupplies).values(
          validated.map((item) => ({
            procedureId,
            supplyId: item.supplyId,
            quantity: item.quantity,
          })),
        );
      }
    });
  }
}

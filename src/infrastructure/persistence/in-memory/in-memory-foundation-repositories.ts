import type { Procedure } from "@/domain/catalog/procedure";
import type { ProcedureRepository } from "@/domain/catalog/procedure-repository";
import type { UserAccount, UserAccountRepository } from "@/domain/auth/user-account";
import type {
  ScheduleConfig,
  ScheduleConfigRepository,
} from "@/domain/scheduling/schedule-config";
import {
  validateKitItems,
  type ProcedureKitItem,
  type ProcedureKitRepository,
} from "@/domain/catalog/procedure-kit";

export class InMemoryProcedureRepository implements ProcedureRepository {
  private readonly items = new Map<string, Procedure>();

  async save(procedure: Procedure): Promise<void> {
    this.items.set(procedure.id, procedure);
  }

  async findById(id: string): Promise<Procedure | null> {
    return this.items.get(id) ?? null;
  }

  async findByName(name: string): Promise<Procedure | null> {
    const normalized = name.trim().toLowerCase();
    return (
      [...this.items.values()].find((p) => p.name.toLowerCase() === normalized) ?? null
    );
  }

  async findAll(): Promise<Procedure[]> {
    return [...this.items.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export class InMemoryUserAccountRepository implements UserAccountRepository {
  private readonly items = new Map<string, UserAccount>();

  async save(account: UserAccount): Promise<void> {
    this.items.set(account.id, account);
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const normalized = email.trim().toLowerCase();
    return [...this.items.values()].find((a) => a.email === normalized) ?? null;
  }

  async findAll(): Promise<UserAccount[]> {
    return [...this.items.values()].sort((a, b) => a.email.localeCompare(b.email));
  }
}

export class InMemoryScheduleConfigRepository implements ScheduleConfigRepository {
  private config: ScheduleConfig | null = null;

  async get(): Promise<ScheduleConfig | null> {
    return this.config;
  }

  async save(config: ScheduleConfig): Promise<void> {
    this.config = config;
  }
}

export class InMemoryProcedureKitRepository implements ProcedureKitRepository {
  private readonly kits = new Map<string, ProcedureKitItem[]>();

  async getKit(procedureId: string): Promise<ProcedureKitItem[]> {
    return [...(this.kits.get(procedureId) ?? [])];
  }

  async setKit(procedureId: string, items: ProcedureKitItem[]): Promise<void> {
    this.kits.set(procedureId, validateKitItems(items));
  }
}

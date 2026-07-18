import type { AuditEvent } from "@/domain/audit/audit-event";
import type {
  AuditEventFilter,
  AuditEventPage,
  AuditEventRepository,
} from "@/domain/audit/audit-event-repository";

export class InMemoryAuditEventRepository implements AuditEventRepository {
  private readonly items: AuditEvent[] = [];

  async save(event: AuditEvent): Promise<void> {
    this.items.push(event);
  }

  async findAll(
    filter: AuditEventFilter = {},
    page: AuditEventPage = {},
  ): Promise<AuditEvent[]> {
    const filtered = this.items
      .filter((e) => {
        if (filter.patientId && e.patientId !== filter.patientId) return false;
        if (filter.from && e.occurredAt.getTime() < filter.from.getTime()) return false;
        if (filter.to && e.occurredAt.getTime() >= filter.to.getTime()) return false;
        return true;
      })
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const offset = page.offset ?? 0;
    return page.limit != null
      ? filtered.slice(offset, offset + page.limit)
      : filtered.slice(offset);
  }
}

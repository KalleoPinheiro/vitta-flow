import type {
  ReminderKind,
  ReminderLog,
  ReminderLogRepository,
} from "@/domain/messaging/reminder-log";

export class InMemoryReminderLogRepository implements ReminderLogRepository {
  private readonly keys = new Set<string>();
  private readonly items: ReminderLog[] = [];

  private static keyOf(kind: ReminderKind, referenceId: string, onDay: string): string {
    return `${kind}|${referenceId}|${onDay}`;
  }

  async save(log: ReminderLog): Promise<void> {
    const key = InMemoryReminderLogRepository.keyOf(log.kind, log.referenceId, log.sentOn);
    if (this.keys.has(key)) {
      return;
    }
    this.keys.add(key);
    this.items.push(log);
  }

  async wasSent(kind: ReminderKind, referenceId: string, onDay: string): Promise<boolean> {
    return this.keys.has(InMemoryReminderLogRepository.keyOf(kind, referenceId, onDay));
  }
}

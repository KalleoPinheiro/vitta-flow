import { and, eq } from "drizzle-orm";
import {
  ReminderLog,
  type ReminderKind,
  type ReminderLogRepository,
} from "@/domain/messaging/reminder-log";
import type { AppDb } from "./db";
import { LEGACY_CLINIC_ID } from "./legacy-clinic";
import { reminderLogs } from "./schema";

export class DrizzleReminderLogRepository implements ReminderLogRepository {
  constructor(private readonly db: AppDb) {}

  async save(log: ReminderLog): Promise<void> {
    await this.db
      .insert(reminderLogs)
      .values({
        id: log.id,
        clinicId: LEGACY_CLINIC_ID,
        kind: log.kind,
        referenceId: log.referenceId,
        sentOn: log.sentOn,
        createdAt: log.createdAt,
      })
      .onConflictDoNothing();
  }

  async wasSent(kind: ReminderKind, referenceId: string, onDay: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: reminderLogs.id })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.kind, kind),
          eq(reminderLogs.referenceId, referenceId),
          eq(reminderLogs.sentOn, onDay),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}

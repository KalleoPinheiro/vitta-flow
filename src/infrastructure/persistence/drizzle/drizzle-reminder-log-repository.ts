import { and, eq } from 'drizzle-orm';
import type {
  ReminderKind,
  ReminderLog,
  ReminderLogRepository,
} from '@/domain/messaging/reminder-log';
import type { AppDb } from './db';
import { LEGACY_CLINIC_ID } from './legacy-clinic';
import { reminderLogs } from './schema';

export class DrizzleReminderLogRepository implements ReminderLogRepository {
  constructor(
    private readonly db: AppDb,
    private readonly clinicId: string | null,
  ) {}

  /**
   * `clinicId` cai em `LEGACY_CLINIC_ID` quando `null` (não lança como os
   * demais repositórios): o job de lembretes (`/api/reminders/run`) é
   * genuinamente cross-empresa por natureza — processa consultas/retornos de
   * TODAS as clínicas num único run, sem um clinicId de sessão para atribuir.
   * `clinic_id` aqui é só metadado (a idempotência diária usa
   * `uq_reminder_logs_daily`, que não inclui clinic_id — ver schema.ts).
   */
  async save(log: ReminderLog): Promise<void> {
    await this.db
      .insert(reminderLogs)
      .values({
        id: log.id,
        clinicId: this.clinicId ?? LEGACY_CLINIC_ID,
        kind: log.kind,
        referenceId: log.referenceId,
        sentOn: log.sentOn,
        createdAt: log.createdAt,
      })
      .onConflictDoNothing();
  }

  async wasSent(
    kind: ReminderKind,
    referenceId: string,
    onDay: string,
  ): Promise<boolean> {
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

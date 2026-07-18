import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import {
  ReminderLog,
  dateKey,
  type ReminderKind,
  type ReminderLogRepository,
} from "@/domain/messaging/reminder-log";
import type { MessagingGateway } from "@/application/ports/messaging-gateway";

export interface ReminderRunSummary {
  sent: number;
  skipped: number;
  failed: number;
  channelEnabled: boolean;
}

interface PendingReminder {
  kind: ReminderKind;
  referenceId: string;
  patientId: string;
  message: (patientFirstName: string) => string;
}

const formatTime = (date: Date): string =>
  date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const formatDay = (date: Date): string => date.toLocaleDateString("pt-BR");

/**
 * Job de lembretes: confirmação D-1 (consultas de amanhã ainda "scheduled") e
 * recall de retornos vencidos. Idempotente por dia via ReminderLog; falha de
 * envio individual não aborta o lote.
 */
export class SendReminders {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly followUps: FollowUpRepository,
    private readonly patients: PatientRepository,
    private readonly reminderLog: ReminderLogRepository,
    private readonly messaging: MessagingGateway,
  ) {}

  async execute(now: Date = new Date()): Promise<ReminderRunSummary> {
    const pending = [
      ...(await this.confirmationReminders(now)),
      ...(await this.recallReminders(now)),
    ];

    const patientsById = new Map(
      (await this.patients.findByIds(pending.map((r) => r.patientId))).map((p) => [p.id, p]),
    );

    const summary: ReminderRunSummary = {
      sent: 0,
      skipped: 0,
      failed: 0,
      channelEnabled: this.messaging.enabled,
    };
    const today = dateKey(now);

    for (const reminder of pending) {
      const patient = patientsById.get(reminder.patientId);
      if (!patient || !patient.isActive) {
        summary.skipped += 1;
        continue;
      }
      if (await this.reminderLog.wasSent(reminder.kind, reminder.referenceId, today)) {
        summary.skipped += 1;
        continue;
      }
      if (!this.messaging.enabled) {
        // Dry-run: loga o que enviaria e não marca como enviado.
        await this.messaging.sendText(
          patient.phone,
          reminder.message(patient.fullName.split(" ")[0]),
        );
        summary.skipped += 1;
        continue;
      }
      try {
        await this.messaging.sendText(
          patient.phone,
          reminder.message(patient.fullName.split(" ")[0]),
        );
        await this.reminderLog.save(ReminderLog.create(reminder.kind, reminder.referenceId, now));
        summary.sent += 1;
      } catch (error) {
        console.error(
          `Lembrete ${reminder.kind}/${reminder.referenceId}: falha no envio`,
          error,
        );
        summary.failed += 1;
      }
    }

    return summary;
  }

  private async confirmationReminders(now: Date): Promise<PendingReminder[]> {
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const appointments = await this.appointments.findInRange(startOfTomorrow, endOfTomorrow);

    return appointments
      .filter((a) => a.status === "scheduled")
      .map((appointment) => ({
        kind: "confirmation" as const,
        referenceId: appointment.id,
        patientId: appointment.patientId,
        message: (name: string) =>
          `Olá, ${name}! Lembrete: sua consulta de ${appointment.procedure} é amanhã, ` +
          `${formatDay(appointment.slot.start)} às ${formatTime(appointment.slot.start)}. ` +
          `Acesse o portal para confirmar presença. Até lá!`,
      }));
  }

  private async recallReminders(now: Date): Promise<PendingReminder[]> {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdue = await this.followUps.findAll({ status: "pending", dueBefore: startOfToday });

    return overdue.map((followUp) => ({
      kind: "recall" as const,
      referenceId: followUp.id,
      patientId: followUp.patientId,
      message: (name: string) =>
        `Olá, ${name}! Seu retorno (${followUp.reason}) estava previsto para ` +
        `${formatDay(followUp.dueDate)}. Entre em contato com a clínica para agendar. ` +
        `Cuidar da continuidade faz toda a diferença!`,
    }));
  }
}

import { newId } from '../shared/id';

export const REMINDER_KINDS = ['confirmation', 'recall'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export interface ReminderLogState {
  id: string;
  kind: ReminderKind;
  /** Id da consulta (confirmation) ou do follow-up (recall). */
  referenceId: string;
  /** Dia do envio (YYYY-MM-DD) — chave de idempotência diária. */
  sentOn: string;
  createdAt: Date;
}

export const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Registro de lembrete enviado — impede reenvio no mesmo dia. */
export class ReminderLog {
  private constructor(private readonly state: ReminderLogState) {}

  static create(
    kind: ReminderKind,
    referenceId: string,
    sentAt: Date = new Date(),
  ): ReminderLog {
    return new ReminderLog({
      id: newId(),
      kind,
      referenceId,
      sentOn: dateKey(sentAt),
      createdAt: sentAt,
    });
  }

  static restore(state: ReminderLogState): ReminderLog {
    return new ReminderLog({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get kind(): ReminderKind {
    return this.state.kind;
  }

  get referenceId(): string {
    return this.state.referenceId;
  }

  get sentOn(): string {
    return this.state.sentOn;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}

export interface ReminderLogRepository {
  save(log: ReminderLog): Promise<void>;
  wasSent(
    kind: ReminderKind,
    referenceId: string,
    onDay: string,
  ): Promise<boolean>;
}

import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { ProcedureRepository } from "@/domain/catalog/procedure-repository";
import {
  DEFAULT_SCHEDULE_CONFIG,
  type ScheduleConfigRepository,
} from "@/domain/scheduling/schedule-config";
import { TimeSlot } from "@/domain/shared/time-slot";
import { NotFoundError } from "@/domain/shared/errors";
import { assertSlotAvailable } from "@/application/appointments/assert-slot-available";

export interface ListAvailableSlotsInput {
  /** Email da sessão do paciente — escopo obrigatório. */
  email: string;
  procedureId: string;
  /** Dia local no formato AAAA-MM-DD. */
  date: string;
  now?: Date;
}

export interface AvailableSlot {
  startsAt: Date;
  endsAt: Date;
}

const MINUTE_MS = 60_000;

/**
 * Horários livres de um dia para o paciente agendar seu retorno (PORT4-01).
 * Cada candidato passa pela MESMA regra do agendamento da equipe
 * (`assertSlotAvailable`: grade configurada, folga mínima e conflitos) — a
 * disponibilidade nunca diverge do que o agendamento aceitaria.
 */
export class ListAvailableSlots {
  constructor(
    private readonly patients: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly procedures: ProcedureRepository,
    private readonly scheduleConfig?: ScheduleConfigRepository,
  ) {}

  async execute(input: ListAvailableSlotsInput): Promise<AvailableSlot[]> {
    const patient = await this.patients.findByEmail(input.email);
    if (!patient || !patient.isActive) {
      throw new NotFoundError("Paciente", input.email);
    }

    const procedure = await this.procedures.findById(input.procedureId);
    if (!procedure || !procedure.isActive) {
      throw new NotFoundError("Procedimento", input.procedureId);
    }

    const config = (await this.scheduleConfig?.get()) ?? DEFAULT_SCHEDULE_CONFIG;
    const day = parseLocalDate(input.date);
    if (!day || !config.weekdays.includes(day.getDay())) {
      return [];
    }

    const now = input.now ?? new Date();
    const durationMs = procedure.durationMinutes * MINUTE_MS;
    const closesAt = new Date(day);
    closesAt.setHours(config.endHour, 0, 0, 0);

    const slots: AvailableSlot[] = [];
    for (
      let start = startOfWindow(day, config.startHour);
      start.getTime() + durationMs <= closesAt.getTime();
      start = new Date(start.getTime() + durationMs)
    ) {
      const end = new Date(start.getTime() + durationMs);
      // Horário já passado não é ofertado.
      if (start.getTime() <= now.getTime()) {
        continue;
      }
      if (await this.isFree(start, end, config)) {
        slots.push({ startsAt: start, endsAt: end });
      }
    }
    return slots;
  }

  private async isFree(
    start: Date,
    end: Date,
    config: typeof DEFAULT_SCHEDULE_CONFIG,
  ): Promise<boolean> {
    try {
      await assertSlotAvailable(
        this.appointments,
        TimeSlot.create(start, end),
        undefined,
        config,
        // Sem profissional: regra global de conflito (default seguro).
        null,
      );
      return true;
    } catch {
      return false;
    }
  }
}

function startOfWindow(day: Date, startHour: number): Date {
  const start = new Date(day);
  start.setHours(startHour, 0, 0, 0);
  return start;
}

/** AAAA-MM-DD → data local; null quando o formato é inválido. */
function parseLocalDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

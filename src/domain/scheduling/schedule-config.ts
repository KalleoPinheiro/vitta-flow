import { ValidationError } from "../shared/errors";

/** Dias da semana como em Date.getDay(): 0=domingo … 6=sábado. */
export interface ScheduleConfig {
  weekdays: number[];
  startHour: number;
  endHour: number;
  minGapMinutes: number;
}

/** Comportamento histórico do sistema — usado quando nada foi configurado. */
export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  weekdays: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 18,
  minGapMinutes: 15,
};

const WEEKDAY_LABELS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Piso imposto pela constraint de exclusão do banco (migração 0002): 15 minutos.
const MIN_GAP_FLOOR = 15;
const MAX_GAP = 120;

const isIntInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

export function validateScheduleConfig(config: ScheduleConfig): ScheduleConfig {
  const weekdays = [...new Set(config.weekdays)].sort((a, b) => a - b);
  if (weekdays.length === 0 || !weekdays.every((d) => isIntInRange(d, 0, 6))) {
    throw new ValidationError("Selecione ao menos um dia da semana válido");
  }
  const hoursValid =
    isIntInRange(config.startHour, 0, 23) &&
    isIntInRange(config.endHour, 1, 24) &&
    config.startHour < config.endHour;
  if (!hoursValid) {
    throw new ValidationError(
      "Horário de funcionamento inválido (abertura antes do fechamento, 0–24h)",
    );
  }
  if (!isIntInRange(config.minGapMinutes, MIN_GAP_FLOOR, MAX_GAP)) {
    throw new ValidationError(
      `Intervalo entre consultas deve ser de ${MIN_GAP_FLOOR} a ${MAX_GAP} minutos`,
    );
  }
  return { ...config, weekdays };
}

export function describeSchedule(config: ScheduleConfig): string {
  const days = config.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ");
  return `${days}, das ${String(config.startHour).padStart(2, "0")}:00 às ${config.endHour}:00`;
}

export interface ScheduleConfigRepository {
  get(): Promise<ScheduleConfig | null>;
  save(config: ScheduleConfig): Promise<void>;
}

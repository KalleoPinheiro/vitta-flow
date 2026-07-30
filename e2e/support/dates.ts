/**
 * Datas para os specs — sempre em dias úteis (segunda a sexta) e dentro da grade
 * padrão (08:00–18:00, intervalo mínimo de 15min — ver `DEFAULT_SCHEDULE_CONFIG`
 * em `src/domain/scheduling/schedule-config.ts`).
 *
 * Os horários usam offset explícito `-03:00` (América/São Paulo, sem horário de
 * verão atualmente) em vez de `Date` local — assim o slot fica correto no servidor
 * (que roda com `TZ=America/Sao_Paulo`) independentemente do fuso da máquina que
 * executa os testes.
 */

export interface YMD {
  year: number;
  month: number;
  day: number;
}

function addUtcDays(base: Date, days: number): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Próximo dia útil (seg–sex) a partir de hoje + `daysFromToday`. */
export function businessDay(daysFromToday: number): YMD {
  let d = addUtcDays(new Date(), daysFromToday);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d = addUtcDays(d, 1);
  }
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Próximo sábado (fim de semana) a partir de hoje + `daysFromToday` — para testar bloqueio. */
export function weekendDay(daysFromToday: number): YMD {
  let d = addUtcDays(new Date(), daysFromToday);
  while (d.getUTCDay() !== 6) {
    d = addUtcDays(d, 1);
  }
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const pad = (n: number): string => String(n).padStart(2, "0");

export const ymdToDateInput = ({ year, month, day }: YMD): string =>
  `${year}-${pad(month)}-${pad(day)}`;

/** ISO com offset fixo -03:00 (América/São Paulo). */
export function saoPauloIso(ymd: YMD, hour: number, minute = 0): string {
  return `${ymd.year}-${pad(ymd.month)}-${pad(ymd.day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
}

export interface Slot {
  ymd: YMD;
  hour: number;
  minute: number;
  startsAt: string;
  endsAt: string;
  dateInput: string;
  startTimeInput: string;
}

function endTime(hour: number, minute: number, durationMinutes: number): { hour: number; minute: number } {
  const total = hour * 60 + minute + durationMinutes;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Hash simples e determinístico — mesma seed sempre gera o mesmo slot. */
function hashSeed(seed: string): number {
  let acc = 7;
  for (const ch of seed) {
    acc = (acc * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return acc;
}

/**
 * Slot dentro da grade padrão, espalhado por seed — evita duas chamadas com seeds
 * diferentes caírem no mesmo horário (a suíte roda com `workers: 1`, mas specs
 * distintos ainda podem ser executados na mesma sessão/banco).
 */
export function slotFromSeed(seed: string, durationMinutes = 60): Slot {
  const hash = hashSeed(seed);
  // O conflito de agenda é GLOBAL (não por profissional, ver
  // `Appointment#conflictsWith`), e a suíte inteira roda contra o mesmo banco
  // pglite compartilhado — seeds de specs diferentes precisam cair em
  // horários bem distintos. dayOffset limitado a ~2 meses (63 dias) para o
  // `goToMonth` de agenda.spec.ts não precisar de dezenas de cliques; a
  // combinação com hora/minuto (63×10×4 = 2.520 slots) já é suficiente para
  // as ~15 seeds reais usadas hoje na suíte (verificado sem colisões).
  const dayOffset = 3 + (hash % 63); // 3..65 dias à frente — nunca hoje/ontem
  const hour = 8 + (Math.floor(hash / 63) % 10); // 8..17 (permite terminar até 18:00 com folga)
  const minute = (Math.floor(hash / 630) % 4) * 15; // 0/15/30/45
  const ymd = businessDay(dayOffset);
  const end = endTime(hour, minute, durationMinutes);
  return {
    ymd,
    hour,
    minute,
    startsAt: saoPauloIso(ymd, hour, minute),
    endsAt: saoPauloIso(ymd, end.hour, end.minute),
    dateInput: ymdToDateInput(ymd),
    startTimeInput: `${pad(hour)}:${pad(minute)}`,
  };
}

/** Horário fora da grade (19h) no mesmo dia útil da seed — para testar bloqueio. */
export function outsideBusinessHoursSlot(seed: string): Slot {
  const base = slotFromSeed(seed);
  return {
    ...base,
    hour: 19,
    minute: 0,
    startsAt: saoPauloIso(base.ymd, 19, 0),
    endsAt: saoPauloIso(base.ymd, 20, 0),
    startTimeInput: "19:00",
  };
}

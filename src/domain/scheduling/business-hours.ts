import { ValidationError } from "../shared/errors";
import type { TimeSlot } from "../shared/time-slot";

const MONDAY = 1;
const FRIDAY = 5;

export const BUSINESS_HOURS = {
  startHour: 8,
  endHour: 18,
  weekDays: "segunda a sexta",
} as const;

export const MIN_GAP_MINUTES = 15;

const isBusinessDay = (date: Date): boolean => {
  const weekday = date.getDay();
  return weekday >= MONDAY && weekday <= FRIDAY;
};

const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const minutesOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export function assertWithinBusinessHours(slot: TimeSlot): void {
  const message =
    `Atendimento somente em horário comercial: ${BUSINESS_HOURS.weekDays}, ` +
    `das ${String(BUSINESS_HOURS.startHour).padStart(2, "0")}:00 às ${BUSINESS_HOURS.endHour}:00`;

  if (!isSameLocalDay(slot.start, slot.end)) {
    throw new ValidationError(message);
  }
  if (!isBusinessDay(slot.start)) {
    throw new ValidationError(message);
  }
  const opensAt = BUSINESS_HOURS.startHour * 60;
  const closesAt = BUSINESS_HOURS.endHour * 60;
  if (minutesOfDay(slot.start) < opensAt || minutesOfDay(slot.end) > closesAt) {
    throw new ValidationError(message);
  }
}

import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import {
  assertWithinBusinessHours,
  MIN_GAP_MINUTES,
} from "@/domain/scheduling/business-hours";
import type { TimeSlot } from "@/domain/shared/time-slot";
import { SchedulingConflictError } from "@/domain/shared/errors";

/**
 * Regra única de disponibilidade de horário (agendar e remarcar):
 * horário comercial + folga mínima entre consultas ativas.
 */
export async function assertSlotAvailable(
  appointments: AppointmentRepository,
  slot: TimeSlot,
  excludeId?: string,
): Promise<void> {
  assertWithinBusinessHours(slot);
  const conflicts = await appointments.findConflicting(slot.expand(MIN_GAP_MINUTES), excludeId);
  if (conflicts.length > 0) {
    throw new SchedulingConflictError(
      `Horário indisponível: é necessário intervalo mínimo de ${MIN_GAP_MINUTES} minutos entre consultas`,
    );
  }
}

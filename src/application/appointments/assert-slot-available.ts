import type { AppointmentRepository } from '@/domain/scheduling/appointment-repository';
import { assertWithinBusinessHours } from '@/domain/scheduling/business-hours';
import {
  DEFAULT_SCHEDULE_CONFIG,
  type ScheduleConfig,
} from '@/domain/scheduling/schedule-config';
import { SchedulingConflictError } from '@/domain/shared/errors';
import type { TimeSlot } from '@/domain/shared/time-slot';

/**
 * Regra única de disponibilidade de horário (agendar e remarcar):
 * grade configurada + folga mínima entre consultas ativas.
 */
export async function assertSlotAvailable(
  appointments: AppointmentRepository,
  slot: TimeSlot,
  excludeId?: string,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
  professionalId?: string | null,
): Promise<void> {
  assertWithinBusinessHours(slot, config);
  const conflicts = await appointments.findConflicting(
    slot.expand(config.minGapMinutes),
    excludeId,
    professionalId,
  );
  if (conflicts.length > 0) {
    throw new SchedulingConflictError(
      `Horário indisponível: é necessário intervalo mínimo de ${config.minGapMinutes} minutos entre consultas`,
    );
  }
}

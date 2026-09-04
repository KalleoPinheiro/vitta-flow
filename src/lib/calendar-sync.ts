import { after } from 'next/server';
import { SyncAppointmentCalendar } from '@/application/appointments/sync-appointment-calendar';
import { NullCalendarGateway } from '@/application/ports/calendar-gateway';
import type { Services } from '@/infrastructure/container';

type CalendarServices = Pick<
  Services,
  'appointments' | 'patients' | 'calendar'
>;

/**
 * Agenda a sincronização com o Google Calendar para depois da resposta (after()).
 * A API do Google fora do ar ou lenta não afeta a latência nem o resultado do request.
 */
export function scheduleCalendarSync(
  services: CalendarServices,
  action: (sync: SyncAppointmentCalendar) => Promise<void>,
): void {
  if (services.calendar instanceof NullCalendarGateway) {
    return;
  }
  after(async () => {
    try {
      await action(
        new SyncAppointmentCalendar(
          services.appointments,
          services.patients,
          services.calendar,
        ),
      );
    } catch (error) {
      console.error(
        'Google Calendar: falha na sincronização pós-request',
        error,
      );
    }
  });
}

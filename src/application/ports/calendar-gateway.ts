export interface CalendarEventInput {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
}

export interface CalendarGateway {
  /** Cria evento e retorna o id externo, ou null se indisponível/falhou. */
  createEvent(input: CalendarEventInput): Promise<string | null>;
  updateEvent(eventId: string, input: CalendarEventInput): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

export class NullCalendarGateway implements CalendarGateway {
  async createEvent(): Promise<string | null> {
    return null;
  }

  async updateEvent(): Promise<void> {}

  async deleteEvent(): Promise<void> {}
}

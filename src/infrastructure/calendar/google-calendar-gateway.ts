import { google, type calendar_v3 } from "googleapis";
import type {
  CalendarEventInput,
  CalendarGateway,
} from "@/application/ports/calendar-gateway";

export interface GoogleCalendarConfig {
  serviceAccountEmail: string;
  privateKey: string;
  calendarId: string;
}

export function googleCalendarConfigFromEnv(): GoogleCalendarConfig | null {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!serviceAccountEmail || !privateKey || !calendarId) {
    return null;
  }
  return {
    serviceAccountEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    calendarId,
  };
}

export class GoogleCalendarGateway implements CalendarGateway {
  private readonly client: calendar_v3.Calendar;

  constructor(private readonly config: GoogleCalendarConfig) {
    const auth = new google.auth.JWT({
      email: config.serviceAccountEmail,
      key: config.privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    this.client = google.calendar({ version: "v3", auth });
  }

  private toEventBody(input: CalendarEventInput): calendar_v3.Schema$Event {
    return {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startsAt.toISOString() },
      end: { dateTime: input.endsAt.toISOString() },
    };
  }

  async createEvent(input: CalendarEventInput): Promise<string | null> {
    try {
      const response = await this.client.events.insert({
        calendarId: this.config.calendarId,
        requestBody: this.toEventBody(input),
      });
      return response.data.id ?? null;
    } catch (error) {
      console.error("Google Calendar: falha ao criar evento", error);
      return null;
    }
  }

  async updateEvent(eventId: string, input: CalendarEventInput): Promise<void> {
    try {
      await this.client.events.patch({
        calendarId: this.config.calendarId,
        eventId,
        requestBody: this.toEventBody(input),
      });
    } catch (error) {
      console.error("Google Calendar: falha ao atualizar evento", error);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.client.events.delete({
        calendarId: this.config.calendarId,
        eventId,
      });
    } catch (error) {
      console.error("Google Calendar: falha ao remover evento", error);
    }
  }
}

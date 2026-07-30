import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NullCalendarGateway, type CalendarGateway } from "@/application/ports/calendar-gateway";
import { SyncAppointmentCalendar } from "@/application/appointments/sync-appointment-calendar";
import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { PatientRepository } from "@/domain/patient/patient-repository";

const afterTasks: Array<() => Promise<void>> = [];

vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    afterTasks.push(task);
  },
}));

// Import após o mock de "next/server", como exigido pelo hoisting do vi.mock.
const { scheduleCalendarSync } = await import("@/lib/calendar-sync");

function buildServices(calendar: CalendarGateway) {
  return {
    appointments: {} as AppointmentRepository,
    patients: {} as PatientRepository,
    calendar,
  };
}

describe("Feature: Agendamento da sincronização com Google Calendar (após a resposta)", () => {
  beforeEach(() => {
    afterTasks.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Dado gateway nulo (integração desativada), Quando scheduleCalendarSync, Então não agenda nada", () => {
    const services = buildServices(new NullCalendarGateway());
    const action = vi.fn().mockResolvedValue(undefined);

    scheduleCalendarSync(services, action);

    expect(afterTasks).toHaveLength(0);
    expect(action).not.toHaveBeenCalled();
  });

  it("Dado gateway real, Quando scheduleCalendarSync, Então agenda a ação com SyncAppointmentCalendar", async () => {
    const gateway: CalendarGateway = {
      createEvent: vi.fn().mockResolvedValue("evt-1"),
      updateEvent: vi.fn().mockResolvedValue(undefined),
      deleteEvent: vi.fn().mockResolvedValue(undefined),
    };
    const services = buildServices(gateway);
    const action = vi.fn().mockResolvedValue(undefined);

    scheduleCalendarSync(services, action);

    expect(afterTasks).toHaveLength(1);
    await afterTasks[0]!();

    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][0]).toBeInstanceOf(SyncAppointmentCalendar);
  });

  it("Dado a ação agendada falha, Quando a tarefa roda, Então não lança e loga no console", async () => {
    const gateway: CalendarGateway = {
      createEvent: vi.fn().mockResolvedValue(null),
      updateEvent: vi.fn().mockResolvedValue(undefined),
      deleteEvent: vi.fn().mockResolvedValue(undefined),
    };
    const services = buildServices(gateway);
    const action = vi.fn().mockRejectedValue(new Error("Google fora do ar"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    scheduleCalendarSync(services, action);

    await expect(afterTasks[0]!()).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Google Calendar: falha na sincronização pós-request",
      expect.any(Error),
    );
  });
});

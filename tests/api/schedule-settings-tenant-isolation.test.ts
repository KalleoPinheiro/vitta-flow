import { describe, it, expect } from "vitest";
import { jsonRequest } from "../support/request";
import { adminCookieHeader } from "../support/session";
import { ensureTestClinics, CLINIC_A_ID, CLINIC_B_ID } from "../support/clinics";

process.env.VITTA_DB_DRIVER = "pglite";

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

interface ScheduleConfigDto {
  config: { weekdays: number[]; startHour: number; endHour: number; minGapMinutes: number };
  isDefault: boolean;
}

describe("Feature: Configuração de horário por empresa (MT-17/MT-18)", () => {
  it("Dadas configurações distintas salvas em 2 clínicas, Quando buscar cada uma, Então cada clínica lê a própria configuração", async () => {
    await ensureTestClinics();
    const scheduleRoute = await import("@/app/api/settings/schedule/route");

    await scheduleRoute.PUT(
      jsonRequest(
        "/api/settings/schedule",
        "PUT",
        { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 18, minGapMinutes: 15 },
        adminCookieHeader(CLINIC_A_ID),
      ),
    );
    await scheduleRoute.PUT(
      jsonRequest(
        "/api/settings/schedule",
        "PUT",
        { weekdays: [1, 2, 3], startHour: 9, endHour: 20, minGapMinutes: 30 },
        adminCookieHeader(CLINIC_B_ID),
      ),
    );

    const responseA = await scheduleRoute.GET(
      jsonRequest("/api/settings/schedule", "GET", undefined, adminCookieHeader(CLINIC_A_ID)),
    );
    const responseB = await scheduleRoute.GET(
      jsonRequest("/api/settings/schedule", "GET", undefined, adminCookieHeader(CLINIC_B_ID)),
    );
    const bodyA = (await responseA.json()) as Envelope<ScheduleConfigDto>;
    const bodyB = (await responseB.json()) as Envelope<ScheduleConfigDto>;

    expect(bodyA.data.config.startHour).toBe(8);
    expect(bodyA.data.config.minGapMinutes).toBe(15);
    expect(bodyB.data.config.startHour).toBe(9);
    expect(bodyB.data.config.minGapMinutes).toBe(30);
  });

  it("Dada clínica sem configuração salva, Quando buscar, Então retorna default sem vazar configuração de outra clínica", async () => {
    await ensureTestClinics();
    const scheduleRoute = await import("@/app/api/settings/schedule/route");
    const freshClinicId = "test-clinic-c-fresh";

    const { getRepositories } = await import("@/infrastructure/container");
    const { Clinic } = await import("@/domain/clinic/clinic");
    const { clinics } = await getRepositories({ clinicId: null });
    if (!(await clinics.findById(freshClinicId))) {
      await clinics.create(
        Clinic.restore({
          id: freshClinicId,
          name: "Clínica C (fresca)",
          createdBy: "test-fixture",
          createdAt: new Date(),
        }),
      );
    }

    const response = await scheduleRoute.GET(
      jsonRequest("/api/settings/schedule", "GET", undefined, adminCookieHeader(freshClinicId)),
    );
    const body = (await response.json()) as Envelope<ScheduleConfigDto>;

    expect(body.data.isDefault).toBe(true);
  });
});

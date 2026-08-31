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

describe("Feature: Isolamento de Condição Clínica e Avaliação por empresa (MT-19)", () => {
  const createPatient = async (clinicId: string, email: string) => {
    const patientsRoute = await import("@/app/api/patients/route");
    const response = await patientsRoute.POST(
      jsonRequest(
        "/api/patients",
        "POST",
        { fullName: "Paciente Teste", email, phone: "11999990000" },
        adminCookieHeader(clinicId),
      ),
    );
    const body = (await response.json()) as Envelope<{ id: string }>;
    return body.data.id;
  };

  const createCondition = async (clinicId: string, patientId: string) => {
    const route = await import("@/app/api/patients/[id]/conditions/route");
    const response = await route.POST(
      jsonRequest(
        `/api/patients/${patientId}/conditions`,
        "POST",
        { kind: "wound", title: "Ferida operatória" },
        adminCookieHeader(clinicId),
      ),
      { params: Promise.resolve({ id: patientId }) },
    );
    const body = (await response.json()) as Envelope<{ id: string }>;
    return body.data.id;
  };

  it("Dada sessão da clínica A, Quando GET /api/conditions/:id de condição da clínica B, Então retorna null", async () => {
    await ensureTestClinics();
    const patientB = await createPatient(CLINIC_B_ID, "cond-b@x.com");
    const conditionB = await createCondition(CLINIC_B_ID, patientB);

    const byIdRoute = await import("@/app/api/conditions/[id]/route");
    const response = await byIdRoute.GET(
      jsonRequest(`/api/conditions/${conditionB}`, "GET", undefined, adminCookieHeader(CLINIC_A_ID)),
      { params: Promise.resolve({ id: conditionB }) },
    );
    const body = (await response.json()) as Envelope<null>;

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
  });

  it("Dada sessão da clínica A, Quando PATCH (resolve) em condição da clínica B, Então 404", async () => {
    await ensureTestClinics();
    const patientB = await createPatient(CLINIC_B_ID, "cond-b2@x.com");
    const conditionB = await createCondition(CLINIC_B_ID, patientB);

    const byIdRoute = await import("@/app/api/conditions/[id]/route");
    const response = await byIdRoute.PATCH(
      jsonRequest(
        `/api/conditions/${conditionB}`,
        "PATCH",
        { action: "resolve" },
        adminCookieHeader(CLINIC_A_ID),
      ),
      { params: Promise.resolve({ id: conditionB }) },
    );

    expect(response.status).toBe(404);
  });

  it("Dada sessão da clínica A, Quando GET avaliações de condição da clínica B, Então lista vazia", async () => {
    await ensureTestClinics();
    const patientB = await createPatient(CLINIC_B_ID, "cond-b3@x.com");
    const conditionB = await createCondition(CLINIC_B_ID, patientB);

    const assessmentsRoute = await import("@/app/api/conditions/[id]/assessments/route");
    await assessmentsRoute.POST(
      jsonRequest(
        `/api/conditions/${conditionB}/assessments`,
        "POST",
        { skinCondition: "Dermatite leve" },
        adminCookieHeader(CLINIC_B_ID),
      ),
      { params: Promise.resolve({ id: conditionB }) },
    );

    const response = await assessmentsRoute.GET(
      jsonRequest(
        `/api/conditions/${conditionB}/assessments`,
        "GET",
        undefined,
        adminCookieHeader(CLINIC_A_ID),
      ),
      { params: Promise.resolve({ id: conditionB }) },
    );
    const body = (await response.json()) as Envelope<unknown[]>;

    expect(body.data).toHaveLength(0);
  });
});

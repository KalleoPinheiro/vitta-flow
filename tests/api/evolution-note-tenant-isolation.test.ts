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

describe("Feature: Isolamento de Nota de Evolução por empresa (MT-19)", () => {
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

  it("Dada sessão da clínica A, Quando GET evoluções de paciente da clínica B, Então lista vazia (isolada pelo escopo do paciente)", async () => {
    await ensureTestClinics();
    const patientB = await createPatient(CLINIC_B_ID, "evo-b@x.com");

    const route = await import("@/app/api/patients/[id]/evolutions/route");
    await route.POST(
      jsonRequest(
        `/api/patients/${patientB}/evolutions`,
        "POST",
        { subjective: "Relato da clínica B" },
        adminCookieHeader(CLINIC_B_ID),
      ),
      { params: Promise.resolve({ id: patientB }) },
    );

    const response = await route.GET(
      jsonRequest(
        `/api/patients/${patientB}/evolutions`,
        "GET",
        undefined,
        adminCookieHeader(CLINIC_A_ID),
      ),
      { params: Promise.resolve({ id: patientB }) },
    );
    const body = (await response.json()) as Envelope<unknown[]>;

    expect(body.data).toHaveLength(0);
  });

  it("Dada sessão da própria clínica, Quando GET evoluções, Então lista inclui a nota criada", async () => {
    await ensureTestClinics();
    const patientB = await createPatient(CLINIC_B_ID, "evo-b2@x.com");

    const route = await import("@/app/api/patients/[id]/evolutions/route");
    await route.POST(
      jsonRequest(
        `/api/patients/${patientB}/evolutions`,
        "POST",
        { subjective: "Relato próprio" },
        adminCookieHeader(CLINIC_B_ID),
      ),
      { params: Promise.resolve({ id: patientB }) },
    );

    const response = await route.GET(
      jsonRequest(
        `/api/patients/${patientB}/evolutions`,
        "GET",
        undefined,
        adminCookieHeader(CLINIC_B_ID),
      ),
      { params: Promise.resolve({ id: patientB }) },
    );
    const body = (await response.json()) as Envelope<Array<{ subjective: string }>>;

    expect(body.data.some((n) => n.subjective === "Relato próprio")).toBe(true);
  });
});

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

describe("Feature: Isolamento de Parceiro por empresa (MT-27)", () => {
  const createPartner = async (clinicId: string, email: string) => {
    const route = await import("@/app/api/partners/route");
    const response = await route.POST(
      jsonRequest(
        "/api/partners",
        "POST",
        { fullName: "Dr. Teste", email, phone: "11988887777" },
        adminCookieHeader(clinicId),
      ),
    );
    const body = (await response.json()) as Envelope<{ id: string }>;
    return body.data.id;
  };

  it("Dada sessão da clínica A, Quando GET /api/partners, Então lista não inclui parceiro da clínica B", async () => {
    await ensureTestClinics();
    const idB = await createPartner(CLINIC_B_ID, "parceiro-exclusivo-b@x.com");

    const route = await import("@/app/api/partners/route");
    const response = await route.GET(
      jsonRequest("/api/partners", "GET", undefined, adminCookieHeader(CLINIC_A_ID)),
    );
    const body = (await response.json()) as Envelope<Array<{ id: string }>>;

    expect(body.data.some((p) => p.id === idB)).toBe(false);
  });

  it("Dada sessão da clínica A, Quando PUT em parceiro da clínica B, Então falha", async () => {
    await ensureTestClinics();
    const idB = await createPartner(CLINIC_B_ID, "parceiro-so-edita-propria@x.com");

    const byIdRoute = await import("@/app/api/partners/[id]/route");
    const response = await byIdRoute.PUT(
      jsonRequest(
        `/api/partners/${idB}`,
        "PUT",
        { fullName: "Tentativa cross-empresa" },
        adminCookieHeader(CLINIC_A_ID),
      ),
      { params: Promise.resolve({ id: idB }) },
    );

    expect(response.status).toBe(404);
  });
});

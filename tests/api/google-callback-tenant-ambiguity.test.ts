import { describe, it, expect, vi } from "vitest";
import { jsonRequest } from "../support/request";
import { adminCookieHeader } from "../support/session";
import { ensureTestClinics, CLINIC_A_ID, CLINIC_B_ID } from "../support/clinics";

process.env.VITTA_DB_DRIVER = "pglite";

/**
 * Mesmo padrão de mock leve do SDK "googleapis" usado em
 * tests/api/auth-portal-gaps.test.ts — sem rede real ao Google.
 */
const googleMockState: { userinfoEmail: string | null } = { userinfoEmail: null };

vi.mock("googleapis", () => {
  class MockOAuth2Client {
    async getToken(_code: string) {
      return { tokens: { refresh_token: undefined } };
    }
    setCredentials() {}
  }
  return {
    google: {
      auth: { OAuth2: MockOAuth2Client },
      oauth2: () => ({
        userinfo: {
          get: async () => ({ data: { email: googleMockState.userinfoEmail ?? undefined } }),
        },
      }),
    },
  };
});

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

describe("Feature: Ambiguidade de conta Google entre empresas (MT-25/MT-26)", () => {
  const configureGoogleEnv = () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.APP_URL = "http://localhost:3000";
    process.env.GOOGLE_ALLOWED_EMAILS = "admin-ambiguity-test@clinica.com";
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-ambiguity";
  };

  const buildCallbackRequest = (state: string) =>
    jsonRequest(`/api/auth/google/callback?code=auth-code&state=${state}`, "GET", undefined, {
      cookie: `vitta_oauth_state=${state}`,
    });

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
    expect(response.status).toBe(200);
    return body.data.id;
  };

  it("Dado e-mail correspondente a só um paciente, Quando GET callback, Então resolve normalmente (não é ambíguo)", async () => {
    await ensureTestClinics();
    configureGoogleEnv();
    const email = "paciente-unico-ambiguity@x.com";
    await createPatient(CLINIC_A_ID, email);
    googleMockState.userinfoEmail = email;

    const googleCallbackRoute = await import("@/app/api/auth/google/callback/route");
    const response = await googleCallbackRoute.GET(buildCallbackRequest("state-unico"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/portal");
  });

  it("Dado o mesmo e-mail cadastrado como paciente em 2 clínicas distintas, Quando GET callback, Então responde 409 sem escolher nenhuma arbitrariamente", async () => {
    await ensureTestClinics();
    configureGoogleEnv();
    const email = "paciente-ambiguo@x.com";
    await createPatient(CLINIC_A_ID, email);
    await createPatient(CLINIC_B_ID, email);
    googleMockState.userinfoEmail = email;

    const googleCallbackRoute = await import("@/app/api/auth/google/callback/route");
    const response = await googleCallbackRoute.GET(buildCallbackRequest("state-ambiguo"));
    const body = (await response.json()) as Envelope<null>;

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
  });
});

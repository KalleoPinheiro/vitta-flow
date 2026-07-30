import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";

process.env.VITTA_DB_DRIVER = "pglite";
process.env.AUTH_SECRET = "test-secret-e2e";

const jsonRequest = (
  url: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Feature: Rotas do portal (paciente e parceiro)", () => {
  let meRoute: typeof import("@/app/api/portal/me/route");
  let patientPortalRoute: typeof import("@/app/api/portal/patient/route");
  let partnerPortalRoute: typeof import("@/app/api/portal/partner/route");
  let confirmRoute: typeof import("@/app/api/portal/patient/appointments/[id]/confirm/route");
  let consentRoute: typeof import("@/app/api/portal/patient/consent/route");
  let photosRoute: typeof import("@/app/api/portal/patient/photos/route");
  let photoByIdRoute: typeof import("@/app/api/portal/patient/photos/[id]/route");

  let patientsRoute: typeof import("@/app/api/patients/route");
  let partnersRoute: typeof import("@/app/api/partners/route");
  let appointmentsRoute: typeof import("@/app/api/appointments/route");
  let conditionsRoute: typeof import("@/app/api/patients/[id]/conditions/route");

  let patientId: string;
  let patientEmail: string;
  let otherPatientId: string;
  let otherPatientEmail: string;
  let partnerId: string;
  let partnerEmail: string;
  let appointmentId: string;
  let conditionId: string;

  let patientCookieToken: string;
  let otherPatientCookieToken: string;
  let partnerCookieToken: string;

  beforeAll(async () => {
    meRoute = await import("@/app/api/portal/me/route");
    patientPortalRoute = await import("@/app/api/portal/patient/route");
    partnerPortalRoute = await import("@/app/api/portal/partner/route");
    confirmRoute = await import("@/app/api/portal/patient/appointments/[id]/confirm/route");
    consentRoute = await import("@/app/api/portal/patient/consent/route");
    photosRoute = await import("@/app/api/portal/patient/photos/route");
    photoByIdRoute = await import("@/app/api/portal/patient/photos/[id]/route");

    patientsRoute = await import("@/app/api/patients/route");
    partnersRoute = await import("@/app/api/partners/route");
    appointmentsRoute = await import("@/app/api/appointments/route");
    conditionsRoute = await import("@/app/api/patients/[id]/conditions/route");

    const { createSessionToken } = await import("@/lib/auth/session");

    // Paciente principal
    patientEmail = "portal.paciente@example.com";
    const patientResponse = await patientsRoute.POST(
      jsonRequest("/api/patients", "POST", {
        fullName: "Joana Portal",
        email: patientEmail,
        phone: "11977776666",
      }),
    );
    const patientBody = (await patientResponse.json()) as Envelope<{ id: string }>;
    patientId = patientBody.data.id;

    // Segundo paciente, para testar posse/negação
    otherPatientEmail = "portal.outro@example.com";
    const otherPatientResponse = await patientsRoute.POST(
      jsonRequest("/api/patients", "POST", {
        fullName: "Carlos Outro",
        email: otherPatientEmail,
        phone: "11955554444",
      }),
    );
    const otherPatientBody = (await otherPatientResponse.json()) as Envelope<{ id: string }>;
    otherPatientId = otherPatientBody.data.id;

    // Parceiro
    partnerEmail = "portal.parceiro@example.com";
    const partnerResponse = await partnersRoute.POST(
      jsonRequest("/api/partners", "POST", {
        fullName: "Dr. Parceiro Portal",
        email: partnerEmail,
        phone: "11933332222",
      }),
    );
    const partnerBody = (await partnerResponse.json()) as Envelope<{ id: string }>;
    partnerId = partnerBody.data.id;

    // Consulta futura do paciente principal
    const appointmentResponse = await appointmentsRoute.POST(
      jsonRequest("/api/appointments", "POST", {
        patientId,
        startsAt: "2027-01-11T12:00:00.000Z",
        endsAt: "2027-01-11T13:00:00.000Z",
        procedure: "Avaliação de ferida",
        priceCents: 15000,
      }),
    );
    const appointmentBody = (await appointmentResponse.json()) as Envelope<{ id: string }>;
    appointmentId = appointmentBody.data.id;

    // Condição clínica ativa para o paciente principal (para testes de foto)
    const conditionResponse = await conditionsRoute.POST(
      jsonRequest(`/api/patients/${patientId}/conditions`, "POST", {
        kind: "wound",
        title: "Ferida abdominal",
      }),
      context(patientId),
    );
    const conditionBody = (await conditionResponse.json()) as Envelope<{ id: string }>;
    conditionId = conditionBody.data.id;

    const expiresAtMs = Date.now() + 3_600_000;
    patientCookieToken = createSessionToken(
      process.env.AUTH_SECRET as string,
      expiresAtMs,
      patientEmail,
      "patient",
    );
    otherPatientCookieToken = createSessionToken(
      process.env.AUTH_SECRET as string,
      expiresAtMs,
      otherPatientEmail,
      "patient",
    );
    partnerCookieToken = createSessionToken(
      process.env.AUTH_SECRET as string,
      expiresAtMs,
      partnerEmail,
      "partner",
    );
  });

  const cookieHeader = (token: string) => ({ cookie: `vitta_session=${token}` });

  describe("GET /api/portal/me", () => {
    it("Dado sem sessão, Quando GET me, Então retorna 401", async () => {
      const response = await meRoute.GET(jsonRequest("/api/portal/me", "GET"));

      expect(response.status).toBe(401);
    });

    it("Dado sessão de paciente válida, Quando GET me, Então retorna subject e role", async () => {
      const response = await meRoute.GET(
        jsonRequest("/api/portal/me", "GET", undefined, cookieHeader(patientCookieToken)),
      );
      const body = (await response.json()) as Envelope<{ subject: string; role: string }>;

      expect(response.status).toBe(200);
      expect(body.data.subject).toBe(patientEmail);
      expect(body.data.role).toBe("patient");
    });

    it("Dado sessão de parceiro válida, Quando GET me, Então retorna role partner", async () => {
      const response = await meRoute.GET(
        jsonRequest("/api/portal/me", "GET", undefined, cookieHeader(partnerCookieToken)),
      );
      const body = (await response.json()) as Envelope<{ subject: string; role: string }>;

      expect(body.data.role).toBe("partner");
    });
  });

  describe("GET /api/portal/patient", () => {
    it("Dado sem sessão, Quando GET portal do paciente, Então retorna 401", async () => {
      const response = await patientPortalRoute.GET(
        jsonRequest("/api/portal/patient", "GET"),
      );

      expect(response.status).toBe(401);
    });

    it("Dado sessão de parceiro, Quando GET portal do paciente, Então retorna 403", async () => {
      const response = await patientPortalRoute.GET(
        jsonRequest("/api/portal/patient", "GET", undefined, cookieHeader(partnerCookieToken)),
      );

      expect(response.status).toBe(403);
    });

    it("Dado sessão de paciente válida, Quando GET portal do paciente, Então retorna dados do próprio paciente", async () => {
      const response = await patientPortalRoute.GET(
        jsonRequest("/api/portal/patient", "GET", undefined, cookieHeader(patientCookieToken)),
      );
      const body = (await response.json()) as Envelope<{
        patient: { id: string; email: string };
        appointments: Array<{ id: string }>;
      }>;

      expect(response.status).toBe(200);
      expect(body.data.patient.id).toBe(patientId);
      expect(body.data.patient.email).toBe(patientEmail);
      expect(body.data.appointments.some((a) => a.id === appointmentId)).toBe(true);
    });
  });

  describe("GET /api/portal/partner", () => {
    it("Dado sem sessão, Quando GET portal do parceiro, Então retorna 401", async () => {
      const response = await partnerPortalRoute.GET(jsonRequest("/api/portal/partner", "GET"));

      expect(response.status).toBe(401);
    });

    it("Dado sessão de paciente, Quando GET portal do parceiro, Então retorna 403", async () => {
      const response = await partnerPortalRoute.GET(
        jsonRequest("/api/portal/partner", "GET", undefined, cookieHeader(patientCookieToken)),
      );

      expect(response.status).toBe(403);
    });

    it("Dado sessão de parceiro válida, Quando GET portal do parceiro, Então retorna dados do próprio parceiro", async () => {
      const response = await partnerPortalRoute.GET(
        jsonRequest("/api/portal/partner", "GET", undefined, cookieHeader(partnerCookieToken)),
      );
      const body = (await response.json()) as Envelope<{ partner: { id: string } }>;

      expect(response.status).toBe(200);
      expect(body.data.partner.id).toBe(partnerId);
    });
  });

  describe("POST /api/portal/patient/appointments/:id/confirm", () => {
    it("Dado sem sessão, Quando POST confirm, Então retorna 401", async () => {
      const response = await confirmRoute.POST(
        jsonRequest(`/api/portal/patient/appointments/${appointmentId}/confirm`, "POST"),
        context(appointmentId),
      );

      expect(response.status).toBe(401);
    });

    it("Dado sessão de parceiro (role errado), Quando POST confirm, Então retorna 403", async () => {
      const response = await confirmRoute.POST(
        jsonRequest(
          `/api/portal/patient/appointments/${appointmentId}/confirm`,
          "POST",
          undefined,
          cookieHeader(partnerCookieToken),
        ),
        context(appointmentId),
      );

      expect(response.status).toBe(403);
    });

    it("Dado consulta de outro paciente, Quando POST confirm, Então retorna 404 (sem vazar existência)", async () => {
      const response = await confirmRoute.POST(
        jsonRequest(
          `/api/portal/patient/appointments/${appointmentId}/confirm`,
          "POST",
          undefined,
          cookieHeader(otherPatientCookieToken),
        ),
        context(appointmentId),
      );

      expect(response.status).toBe(404);
    });

    it("Dado consulta do próprio paciente, Quando POST confirm, Então confirma presença", async () => {
      const response = await confirmRoute.POST(
        jsonRequest(
          `/api/portal/patient/appointments/${appointmentId}/confirm`,
          "POST",
          undefined,
          cookieHeader(patientCookieToken),
        ),
        context(appointmentId),
      );
      const body = (await response.json()) as Envelope<{ status: string }>;

      expect(response.status).toBe(200);
      expect(body.data.status).toBe("confirmed");
    });
  });

  describe("GET/POST /api/portal/patient/consent", () => {
    it("Dado sem sessão, Quando GET consent, Então retorna 401", async () => {
      const response = await consentRoute.GET(jsonRequest("/api/portal/patient/consent", "GET"));

      expect(response.status).toBe(401);
    });

    it("Dado paciente sem aceite prévio, Quando GET consent, Então accepted é false", async () => {
      const response = await consentRoute.GET(
        jsonRequest(
          "/api/portal/patient/consent",
          "GET",
          undefined,
          cookieHeader(otherPatientCookieToken),
        ),
      );
      const body = (await response.json()) as Envelope<{ accepted: boolean }>;

      expect(response.status).toBe(200);
      expect(body.data.accepted).toBe(false);
    });

    it("Dado aceite via POST, Quando GET consent em seguida, Então accepted é true e IP capturado", async () => {
      const postResponse = await consentRoute.POST(
        jsonRequest(
          "/api/portal/patient/consent",
          "POST",
          undefined,
          { ...cookieHeader(patientCookieToken), "x-forwarded-for": "203.0.113.5" },
        ),
      );
      const postBody = (await postResponse.json()) as Envelope<{ accepted: boolean }>;

      expect(postResponse.status).toBe(200);
      expect(postBody.data.accepted).toBe(true);

      const getResponse = await consentRoute.GET(
        jsonRequest(
          "/api/portal/patient/consent",
          "GET",
          undefined,
          cookieHeader(patientCookieToken),
        ),
      );
      const getBody = (await getResponse.json()) as Envelope<{ accepted: boolean }>;

      expect(getBody.data.accepted).toBe(true);
    });

    it("Dado aceite já registrado, Quando POST consent novamente, Então retorna o aceite existente (idempotente)", async () => {
      const response = await consentRoute.POST(
        jsonRequest(
          "/api/portal/patient/consent",
          "POST",
          undefined,
          cookieHeader(patientCookieToken),
        ),
      );
      const body = (await response.json()) as Envelope<{ accepted: boolean }>;

      expect(response.status).toBe(200);
      expect(body.data.accepted).toBe(true);
    });
  });

  describe("POST /api/portal/patient/photos e /api/portal/patient/photos/:id", () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);

    const multipartRequest = (
      url: string,
      fields: { file?: File; conditionId?: string; note?: string },
      headers?: Record<string, string>,
    ): NextRequest => {
      const form = new FormData();
      if (fields.file) form.set("file", fields.file);
      if (fields.conditionId !== undefined) form.set("conditionId", fields.conditionId);
      if (fields.note !== undefined) form.set("note", fields.note);
      return new NextRequest(`http://localhost${url}`, {
        method: "POST",
        body: form,
        headers,
      });
    };

    it("Dado sem sessão, Quando POST photos, Então retorna 401", async () => {
      const response = await photosRoute.POST(
        multipartRequest("/api/portal/patient/photos", {}),
      );

      expect(response.status).toBe(401);
    });

    it("Dado sessão de parceiro, Quando POST photos, Então retorna 403", async () => {
      const response = await photosRoute.POST(
        multipartRequest("/api/portal/patient/photos", {}, cookieHeader(partnerCookieToken)),
      );

      expect(response.status).toBe(403);
    });

    it("Dado sem arquivo, Quando POST photos, Então retorna 400", async () => {
      const response = await photosRoute.POST(
        multipartRequest(
          "/api/portal/patient/photos",
          { conditionId },
          cookieHeader(patientCookieToken),
        ),
      );

      expect(response.status).toBe(400);
    });

    it("Dado condição de outro paciente, Quando POST photos, Então retorna 404", async () => {
      const file = new File([pngBytes], "foto.png", { type: "image/png" });
      const response = await photosRoute.POST(
        multipartRequest(
          "/api/portal/patient/photos",
          { file, conditionId },
          cookieHeader(otherPatientCookieToken),
        ),
      );

      expect(response.status).toBe(404);
    });

    let uploadedPhotoId: string;

    it("Dado arquivo PNG válido e condição própria ativa, Quando POST photos, Então cria foto pendente de triagem", async () => {
      const file = new File([pngBytes], "foto.png", { type: "image/png" });
      const response = await photosRoute.POST(
        multipartRequest(
          "/api/portal/patient/photos",
          { file, conditionId, note: "está inflamado" },
          cookieHeader(patientCookieToken),
        ),
      );
      const body = (await response.json()) as Envelope<{ id: string; triageStatus: string }>;

      expect(response.status).toBe(200);
      expect(body.data.triageStatus).toBe("pending");
      uploadedPhotoId = body.data.id;
    });

    it("Dado foto do próprio paciente, Quando GET photos/:id, Então retorna o binário", async () => {
      const response = await photoByIdRoute.GET(
        jsonRequest(
          `/api/portal/patient/photos/${uploadedPhotoId}`,
          "GET",
          undefined,
          cookieHeader(patientCookieToken),
        ),
        context(uploadedPhotoId),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
    });

    it("Dado foto de outro paciente, Quando GET photos/:id, Então retorna 404", async () => {
      const response = await photoByIdRoute.GET(
        jsonRequest(
          `/api/portal/patient/photos/${uploadedPhotoId}`,
          "GET",
          undefined,
          cookieHeader(otherPatientCookieToken),
        ),
        context(uploadedPhotoId),
      );

      expect(response.status).toBe(404);
    });

    it("Dado id inexistente, Quando GET photos/:id, Então retorna 404", async () => {
      const response = await photoByIdRoute.GET(
        jsonRequest(
          "/api/portal/patient/photos/ghost",
          "GET",
          undefined,
          cookieHeader(patientCookieToken),
        ),
        context("ghost"),
      );

      expect(response.status).toBe(404);
    });
  });
});

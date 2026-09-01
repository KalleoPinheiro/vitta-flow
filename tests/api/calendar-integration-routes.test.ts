import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookieHeaderFor } from "../support/session";
import { CLINIC_A_ID } from "../support/clinics";
import { CALENDAR_OAUTH_STATE_COOKIE } from "@/lib/auth/google-calendar-oauth";

/**
 * O cliente OAuth é interceptável para os casos de callback (a troca do `code`
 * é uma chamada HTTP real ao Google), mas por padrão delega para a
 * implementação verdadeira — os casos de início precisam da URL de
 * consentimento que o `googleapis` monta de fato.
 */
const { oauthClientMock, realClient } = vi.hoisted(() => ({
  oauthClientMock: vi.fn(),
  realClient: { create: null as null | ((config: unknown) => unknown) },
}));

vi.mock("@/lib/auth/google-oauth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/google-oauth-client")>();
  realClient.create = actual.createOAuthClient as (config: unknown) => unknown;
  return { createOAuthClient: oauthClientMock };
});

process.env.VITTA_DB_DRIVER = "pglite";

const staffHeaders = (): Record<string, string> =>
  cookieHeaderFor("company_admin", "agenda@clinica.com", CLINIC_A_ID);

const getRequest = (url: string, headers: Record<string, string> = staffHeaders()) =>
  new NextRequest(`http://localhost${url}`, { method: "GET", headers });

/**
 * AUTH-15 / AUTH-16: conectar a agenda é uma integração iniciada por sessão
 * nativa de equipe — sem sessão, o fluxo nem começa.
 */
describe("Feature: Conexão do Google Agenda desacoplada do login", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client-abc";
    process.env.GOOGLE_CLIENT_SECRET = "secret-xyz";
    process.env.APP_URL = "https://app.vitta.test";
    oauthClientMock.mockImplementation((config: unknown) => realClient.create!(config));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("Cenário: iniciar a conexão", () => {
    it("Dado sessão de equipe, Quando GET na rota de início, Então redireciona ao Google pedindo só o escopo de eventos com access_type offline", async () => {
      const route = await import("@/app/api/integrations/google-calendar/route");

      const response = await route.GET(getRequest("/api/integrations/google-calendar"));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://accounts.google.com");
      expect(location.searchParams.get("scope")).toBe(
        "https://www.googleapis.com/auth/calendar.events",
      );
      expect(location.searchParams.get("access_type")).toBe("offline");
      expect(location.searchParams.get("redirect_uri")).toBe(
        "https://app.vitta.test/api/integrations/google-calendar/callback",
      );
    });

    it("Dado sessão de equipe, Quando GET na rota de início, Então grava o cookie de estado anti-CSRF", async () => {
      const route = await import("@/app/api/integrations/google-calendar/route");

      const response = await route.GET(getRequest("/api/integrations/google-calendar"));

      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(`${CALENDAR_OAUTH_STATE_COOKIE}=`);
      const state = new URL(response.headers.get("location")!).searchParams.get("state");
      expect(setCookie).toContain(`${CALENDAR_OAUTH_STATE_COOKIE}=${state}`);
    });

    it("Dado nenhuma sessão, Quando GET na rota de início, Então responde 401 e não redireciona", async () => {
      const route = await import("@/app/api/integrations/google-calendar/route");

      const response = await route.GET(
        new NextRequest("http://localhost/api/integrations/google-calendar", { method: "GET" }),
      );

      expect(response.status).toBe(401);
      expect(response.headers.get("location")).toBeNull();
    });

    it("Dado credenciais do Google ausentes, Quando GET na rota de início, Então responde 503", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const route = await import("@/app/api/integrations/google-calendar/route");

      const response = await route.GET(getRequest("/api/integrations/google-calendar"));

      expect(response.status).toBe(503);
    });
  });

});

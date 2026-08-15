import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const SECRET = "test-secret";
let savedSecret: string | undefined;

function requestAs(role?: "admin" | "partner" | "patient", subject = "maria@x.com"): NextRequest {
  const headers: Record<string, string> = {};
  if (role) {
    const token = createSessionToken(SECRET, Date.now() + 60_000, subject, role);
    headers.cookie = `${SESSION_COOKIE}=${token}`;
  }
  return new NextRequest("http://localhost/api/portal/patient", { headers });
}

describe("Feature: Guard de papel das rotas do portal (SEC1-14..16)", () => {
  beforeEach(() => {
    savedSecret = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (savedSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = savedSecret;
    }
  });

  it("Dado requisição sem sessão, Quando exigir patient, Então 401 com envelope padrão", async () => {
    const result = requireRole(requestAs(undefined), "patient");

    expect(result.session).toBeUndefined();
    expect(result.error?.status).toBe(401);
    const body = await result.error?.json();
    expect(body).toEqual({ success: false, data: null, error: "Não autenticado" });
  });

  it("Dado sessão partner, Quando exigir patient, Então 403 com a mensagem atual da rota", async () => {
    const result = requireRole(requestAs("partner"), "patient");

    expect(result.error?.status).toBe(403);
    const body = await result.error?.json();
    expect(body.error).toBe("Rota exclusiva do portal do paciente");
  });

  it("Dado sessão patient, Quando exigir partner, Então 403 com a mensagem do parceiro", async () => {
    const result = requireRole(requestAs("patient"), "partner");

    expect(result.error?.status).toBe(403);
    const body = await result.error?.json();
    expect(body.error).toBe("Rota exclusiva do portal do parceiro");
  });

  it("Dado sessão com o papel exigido, Quando exigir, Então retorna a sessão com subject", () => {
    const result = requireRole(requestAs("patient", "paciente@x.com"), "patient");

    expect(result.error).toBeUndefined();
    expect(result.session?.subject).toBe("paciente@x.com");
    expect(result.session?.role).toBe("patient");
  });
});

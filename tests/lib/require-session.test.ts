import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { requirePortalSession, requireStaffSession } from "@/lib/auth/require-session";
import { resetAuthModeWarning } from "@/lib/auth/access-policy";
import { cookieHeaderFor } from "../support/session";

const request = (headers: Record<string, string> = {}): NextRequest =>
  new NextRequest("http://localhost/api/patients", { headers });

const errorOf = async (response: Response) =>
  ((await response.json()) as { error: string }).error;

describe("Feature: Guarda de sessão nas rotas (camada 2 de autorização)", () => {
  const saved = {
    secret: process.env.AUTH_SECRET,
    password: process.env.AUTH_PASSWORD,
    openMode: process.env.VITTA_ALLOW_OPEN_MODE,
  };

  beforeEach(() => {
    resetAuthModeWarning();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.AUTH_SECRET = saved.secret;
    process.env.AUTH_PASSWORD = saved.password;
    if (saved.openMode === undefined) {
      delete process.env.VITTA_ALLOW_OPEN_MODE;
    } else {
      process.env.VITTA_ALLOW_OPEN_MODE = saved.openMode;
    }
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("Cenário: rotas da equipe (requireStaffSession)", () => {
    it("Dada sessão admin válida, Então libera e devolve a sessão", () => {
      const guard = requireStaffSession(request(cookieHeaderFor("admin", "maria@clinica.com")));

      expect(guard.ok).toBe(true);
      if (!guard.ok) return;
      expect(guard.session?.subject).toBe("maria@clinica.com");
      expect(guard.session?.role).toBe("admin");
    });

    it("Dada requisição sem cookie, Então responde 401", async () => {
      const guard = requireStaffSession(request());

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(guard.response.status).toBe(401);
      expect(await errorOf(guard.response)).toBe("Não autenticado");
    });

    it.each(["patient", "partner"] as const)(
      "Dada sessão de %s, Então responde 403 (rota de equipe)",
      async (role) => {
        const guard = requireStaffSession(request(cookieHeaderFor(role)));

        expect(guard.ok).toBe(false);
        if (guard.ok) return;
        expect(guard.response.status).toBe(403);
        expect(await errorOf(guard.response)).toBe("Acesso restrito à equipe da clínica");
      },
    );

    it("Dado cookie assinado por outro segredo, Então responde 401", () => {
      const forjado = { cookie: "vitta_session=payload.assinatura-invalida" };

      const guard = requireStaffSession(request(forjado));

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(guard.response.status).toBe(401);
    });

    it("Dada autenticação não configurada, Então responde 503 (fail-closed)", async () => {
      delete process.env.AUTH_SECRET;
      delete process.env.AUTH_PASSWORD;

      const guard = requireStaffSession(request());

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(guard.response.status).toBe(503);
      expect(await errorOf(guard.response)).toMatch(/Autenticação não configurada/);
    });

    it("Dado modo aberto explícito, Então libera com sessão nula (auditoria anônima)", () => {
      delete process.env.AUTH_SECRET;
      delete process.env.AUTH_PASSWORD;
      vi.stubEnv("NODE_ENV", "development");
      process.env.VITTA_ALLOW_OPEN_MODE = "true";

      const guard = requireStaffSession(request());

      expect(guard.ok).toBe(true);
      if (!guard.ok) return;
      expect(guard.session).toBeNull();
    });
  });

  describe("Cenário: rotas do portal (requirePortalSession)", () => {
    it("Dada sessão do papel esperado, Então libera com sessão não-nula", () => {
      const guard = requirePortalSession(
        request(cookieHeaderFor("patient", "ana@paciente.com")),
        "patient",
      );

      expect(guard.ok).toBe(true);
      if (!guard.ok) return;
      expect(guard.session.subject).toBe("ana@paciente.com");
    });

    it("Dada sessão de outro papel, Então responde 403 com mensagem do portal", async () => {
      const guard = requirePortalSession(request(cookieHeaderFor("partner")), "patient");

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(guard.response.status).toBe(403);
      expect(await errorOf(guard.response)).toBe("Rota exclusiva do portal do paciente");
    });

    it("Dada sessão de paciente numa rota de parceiro, Então responde 403", async () => {
      const guard = requirePortalSession(request(cookieHeaderFor("patient")), "partner");

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(await errorOf(guard.response)).toBe("Rota exclusiva do portal do parceiro");
    });

    it("Dada lista de papéis aceitos, Então qualquer um deles passa", () => {
      const roles = ["admin", "partner", "patient"] as const;

      for (const role of roles) {
        expect(requirePortalSession(request(cookieHeaderFor(role)), roles).ok).toBe(true);
      }
    });

    it("Dado modo aberto, Então AINDA exige sessão (o handler precisa da identidade)", async () => {
      delete process.env.AUTH_SECRET;
      delete process.env.AUTH_PASSWORD;
      vi.stubEnv("NODE_ENV", "development");
      process.env.VITTA_ALLOW_OPEN_MODE = "true";

      const guard = requirePortalSession(request(), "patient");

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(guard.response.status).toBe(401);
    });

    it("Dada autenticação não configurada, Então responde 503", () => {
      delete process.env.AUTH_SECRET;
      delete process.env.AUTH_PASSWORD;

      const guard = requirePortalSession(request(), "patient");

      expect(guard.ok).toBe(false);
      if (guard.ok) return;
      expect(guard.response.status).toBe(503);
    });
  });
});

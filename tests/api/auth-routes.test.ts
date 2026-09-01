import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.VITTA_DB_DRIVER = "pglite";

const jsonRequest = (url: string, method: string, body?: unknown, headers?: Record<string, string>) =>
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

describe("Feature: Rotas de autenticação (login, logout, provedores, Google OAuth)", () => {
  let loginRoute: typeof import("@/app/api/auth/login/route");
  let logoutRoute: typeof import("@/app/api/auth/logout/route");
  let providersRoute: typeof import("@/app/api/auth/providers/route");

  const originalEnv = { ...process.env };

  const resetAuthEnv = () => {
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_PASSWORD;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.APP_URL;
    delete process.env.GOOGLE_ALLOWED_EMAILS;
  };

  beforeAll(async () => {
    loginRoute = await import("@/app/api/auth/login/route");
    logoutRoute = await import("@/app/api/auth/logout/route");
    providersRoute = await import("@/app/api/auth/providers/route");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("Dado AUTH_SECRET ausente, Quando POST login, Então retorna 503", async () => {
      resetAuthEnv();
      const response = await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", { password: "qualquer" }, {
          "x-forwarded-for": "10.0.0.1",
        }),
      );
      const body = (await response.json()) as Envelope<null>;

      expect(response.status).toBe(503);
      expect(body.error).toContain("Autenticação não configurada");
    });

    it("Dado requisição sem x-forwarded-for, Quando POST login, Então usa IP 'unknown' e responde normalmente", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";

      const response = await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", { password: "senha-errada" }),
      );

      expect(response.status).toBe(401);
    });

    it("Dado senha master incorreta, Quando POST login, Então retorna 401", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";

      const response = await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", { password: "senha-errada" }, {
          "x-forwarded-for": "10.0.0.2",
        }),
      );

      expect(response.status).toBe(401);
    });

    it("Dado login por senha master desativado (sem AUTH_PASSWORD), Quando POST login, Então retorna 403", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";

      const response = await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", { password: "qualquer" }, {
          "x-forwarded-for": "10.0.0.3",
        }),
      );
      const body = (await response.json()) as Envelope<null>;

      expect(response.status).toBe(403);
      expect(body.error).toContain("Login por senha desativado");
    });

    it("Dado senha master correta, Quando POST login, Então cria sessão com cookie", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";

      const response = await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", { password: "senha-correta" }, {
          "x-forwarded-for": "10.0.0.4",
        }),
      );
      const body = (await response.json()) as Envelope<{ ok: boolean }>;

      expect(response.status).toBe(200);
      expect(body.data.ok).toBe(true);
      expect(response.headers.get("set-cookie")).toContain("vitta_session=");
    });

    it("Dado senha master correta, Quando POST login, Então loga aviso de credencial compartilhada (SEC1-19)", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", { password: "senha-correta" }, {
          "x-forwarded-for": "10.0.0.44",
        }),
      );

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("senha master"));
      warnSpy.mockRestore();
    });

    it("Dado conta individual inexistente, Quando POST login com email, Então retorna 401", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";

      const response = await loginRoute.POST(
        jsonRequest(
          "/api/auth/login",
          "POST",
          { password: "abc123", email: "fulano@clinica.com" },
          { "x-forwarded-for": "10.0.0.5" },
        ),
      );
      const body = (await response.json()) as Envelope<null>;

      expect(response.status).toBe(401);
      expect(body.error).toContain("Email ou senha incorretos");
    });

    it("Dado conta individual ativa com senha correta, Quando POST login com email, Então cria sessão", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";

      const { getRepositories } = await import("@/infrastructure/container");
      const { hashPassword } = await import("@/lib/auth/password");
      const { UserAccount } = await import("@/domain/auth/user-account");
      const { userAccounts } = await getRepositories({ clinicId: "legacy-clinic" });
      await userAccounts.save(
        UserAccount.create({
          email: "equipe@clinica.com",
          passwordHash: await hashPassword("s3nh@individual"),
          role: "company_admin",
          clinicId: "legacy-clinic",
        }),
      );

      const response = await loginRoute.POST(
        jsonRequest(
          "/api/auth/login",
          "POST",
          { password: "s3nh@individual", email: "equipe@clinica.com" },
          { "x-forwarded-for": "10.0.0.6" },
        ),
      );
      const body = (await response.json()) as Envelope<{ ok: boolean }>;

      expect(response.status).toBe(200);
      expect(body.data.ok).toBe(true);
    });

    it("Dado conta com papel profissional, Quando POST login com email, Então sessão usa o papel e a empresa da própria conta (fix RBAC-02/RBAC-04)", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-role-fix";
      process.env.AUTH_PASSWORD = "senha-correta";

      const { getRepositories } = await import("@/infrastructure/container");
      const { hashPassword } = await import("@/lib/auth/password");
      const { UserAccount } = await import("@/domain/auth/user-account");
      const { verifySessionToken } = await import("@/lib/auth/session");
      const { userAccounts } = await getRepositories({ clinicId: "legacy-clinic" });
      await userAccounts.save(
        UserAccount.create({
          email: "profissional@clinica.com",
          passwordHash: await hashPassword("s3nh@profissional"),
          role: "profissional",
          clinicId: "legacy-clinic",
        }),
      );

      const response = await loginRoute.POST(
        jsonRequest(
          "/api/auth/login",
          "POST",
          { password: "s3nh@profissional", email: "profissional@clinica.com" },
          { "x-forwarded-for": "10.0.0.60" },
        ),
      );
      const cookie = response.headers.get("set-cookie") ?? "";
      const token = cookie.match(/vitta_session=([^;]+)/)?.[1] ?? "";

      const session = verifySessionToken("test-secret-role-fix", token);
      expect(session?.role).toBe("profissional");
      expect(session?.role).not.toBe("admin");
      expect(session?.clinicId).toBe("legacy-clinic");
    });

    it("Dado body inválido (sem password), Quando POST login, Então retorna 401", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";

      const response = await loginRoute.POST(
        jsonRequest("/api/auth/login", "POST", {}, { "x-forwarded-for": "10.0.0.7" }),
      );

      expect(response.status).toBe(401);
    });

    it("Dado múltiplas tentativas seguidas do mesmo IP, Quando excede o limite, Então retorna 429", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";
      process.env.AUTH_PASSWORD = "senha-correta";
      const ip = "10.0.0.100";

      let lastStatus = 0;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await loginRoute.POST(
          jsonRequest("/api/auth/login", "POST", { password: "errada" }, {
            "x-forwarded-for": ip,
          }),
        );
        lastStatus = response.status;
      }

      expect(lastStatus).toBe(429);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("Dado sessão ativa, Quando POST logout, Então limpa o cookie de sessão", async () => {
      const response = await logoutRoute.POST();
      const body = (await response.json()) as Envelope<{ ok: boolean }>;

      expect(response.status).toBe(200);
      expect(body.data.ok).toBe(true);
      const cookie = response.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("vitta_session=");
      expect(cookie).toMatch(/max-age=0/i);
    });
  });

  describe("GET /api/auth/providers", () => {
    it("Dado nenhuma configuração de auth, Quando GET providers, Então retorna senha desativada", async () => {
      resetAuthEnv();
      const response = await providersRoute.GET();
      const body = (await response.json()) as Envelope<{ password: boolean }>;

      expect(response.status).toBe(200);
      expect(body.data.password).toBe(false);
    });

    it("Dado AUTH_SECRET configurado, Quando GET providers, Então retorna senha ativa", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";

      const response = await providersRoute.GET();
      const body = (await response.json()) as Envelope<{ password: boolean }>;

      expect(body.data.password).toBe(true);
      resetAuthEnv();
    });

    it("Dado AUTH_SECRET configurado e nenhuma variável do Google, Quando GET providers, Então a resposta não anuncia provedor Google", async () => {
      resetAuthEnv();
      process.env.AUTH_SECRET = "test-secret-e2e";

      const response = await providersRoute.GET();
      const body = (await response.json()) as Envelope<Record<string, boolean>>;

      expect(Object.keys(body.data)).toEqual(["password"]);
      resetAuthEnv();
    });
  });

  it("Ao final, restaura variáveis de ambiente originais", () => {
    process.env = { ...originalEnv };
    expect(true).toBe(true);
  });
});

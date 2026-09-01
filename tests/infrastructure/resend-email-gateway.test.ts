import { describe, it, expect, afterEach, vi } from "vitest";
import { NullEmailGateway } from "@/application/ports/email-gateway";
import {
  ResendEmailGateway,
  buildEmailGateway,
  resendConfigFromEnv,
} from "@/infrastructure/email/resend-email-gateway";

/**
 * AUTH-02: em produção, a ausência de RESEND_API_KEY/EMAIL_FROM falha na
 * construção do gateway nomeando as duas variáveis — nunca cai em dry-run
 * silencioso. Fora de produção, o gateway nulo é o caminho de dev/teste.
 */
describe("Feature: Gateway de e-mail transacional (Resend)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  describe("Cenário: enviar e-mail", () => {
    it("Dado envio bem-sucedido, Quando send, Então chama a API do Resend com URL, headers e corpo corretos", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);
      const gateway = new ResendEmailGateway({ apiKey: "re_123", from: "VittaFlow <no@v.com>" });

      await gateway.send({ to: "p@c.com", subject: "Defina sua senha", text: "link aqui" });

      expect(gateway.enabled).toBe(true);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.resend.com/emails");
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        Authorization: "Bearer re_123",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(options.body as string)).toEqual({
        from: "VittaFlow <no@v.com>",
        to: ["p@c.com"],
        subject: "Defina sua senha",
        text: "link aqui",
      });
    });

    it("Dado resposta de erro da API, Quando send, Então lança Error contendo o status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          text: () => Promise.resolve("invalid from"),
        }),
      );
      const gateway = new ResendEmailGateway({ apiKey: "re_123", from: "no@v.com" });

      await expect(
        gateway.send({ to: "p@c.com", subject: "s", text: "t" }),
      ).rejects.toThrow("Resend API 422: invalid from");
    });

    it("Dado falha ao ler o corpo do erro, Quando send, Então ainda lança Error com o status", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.reject(new Error("stream")),
        }),
      );
      const gateway = new ResendEmailGateway({ apiKey: "re_123", from: "no@v.com" });

      await expect(gateway.send({ to: "p@c.com", subject: "s", text: "t" })).rejects.toThrow(
        "Resend API 500:",
      );
    });
  });

  describe("Cenário: montar configuração a partir do ambiente", () => {
    it("Dado RESEND_API_KEY e EMAIL_FROM definidos, Quando ler do ambiente, Então retorna a config", () => {
      process.env.RESEND_API_KEY = "re_abc";
      process.env.EMAIL_FROM = "clinica@v.com";

      expect(resendConfigFromEnv()).toEqual({ apiKey: "re_abc", from: "clinica@v.com" });
    });

    it("Dado RESEND_API_KEY ausente, Quando ler do ambiente, Então retorna null", () => {
      delete process.env.RESEND_API_KEY;
      process.env.EMAIL_FROM = "clinica@v.com";

      expect(resendConfigFromEnv()).toBeNull();
    });

    it("Dado EMAIL_FROM ausente, Quando ler do ambiente, Então retorna null", () => {
      process.env.RESEND_API_KEY = "re_abc";
      delete process.env.EMAIL_FROM;

      expect(resendConfigFromEnv()).toBeNull();
    });
  });

  describe("Cenário: construir o gateway conforme o ambiente", () => {
    it("Dado credenciais presentes, Quando construir, Então devolve o gateway real habilitado", () => {
      process.env.RESEND_API_KEY = "re_abc";
      process.env.EMAIL_FROM = "clinica@v.com";

      const gateway = buildEmailGateway();

      expect(gateway).toBeInstanceOf(ResendEmailGateway);
      expect(gateway.enabled).toBe(true);
    });

    it("Dado produção sem credenciais, Quando construir, Então lança erro nomeando RESEND_API_KEY e EMAIL_FROM", () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;

      expect(() => buildEmailGateway()).toThrow(/RESEND_API_KEY/);
      expect(() => buildEmailGateway()).toThrow(/EMAIL_FROM/);
    });

    it("Dado ambiente fora de produção sem credenciais, Quando construir, Então devolve o gateway nulo (dry-run)", () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.EMAIL_FROM;

      expect(buildEmailGateway()).toBeInstanceOf(NullEmailGateway);
    });
  });
});

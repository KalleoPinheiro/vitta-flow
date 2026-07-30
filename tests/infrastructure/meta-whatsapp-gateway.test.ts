import { describe, it, expect, afterEach, vi } from "vitest";
import {
  MetaWhatsAppGateway,
  metaWhatsAppConfigFromEnv,
  normalizeBrazilianPhone,
} from "@/infrastructure/messaging/meta-whatsapp-gateway";

describe("Feature: Gateway de mensagens WhatsApp (Meta Cloud API)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Cenário: enviar mensagem de texto", () => {
    it("Dado envio bem-sucedido, Quando sendText, Então não lança e chama a API com URL, headers e corpo corretos", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);
      const gateway = new MetaWhatsAppGateway({ token: "tok-123", phoneNumberId: "phone-456" });

      await gateway.sendText("11999990000", "Olá, tudo bem?");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://graph.facebook.com/v20.0/phone-456/messages");
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        Authorization: "Bearer tok-123",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(options.body as string)).toEqual({
        messaging_product: "whatsapp",
        to: "5511999990000",
        type: "text",
        text: { body: "Olá, tudo bem?" },
      });
    });

    it("Dado resposta de erro da API, Quando sendText, Então lança Error contendo o status", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });
      vi.stubGlobal("fetch", fetchMock);
      const gateway = new MetaWhatsAppGateway({ token: "tok-123", phoneNumberId: "phone-456" });

      await expect(gateway.sendText("11999990000", "Olá")).rejects.toThrow(
        "WhatsApp API 401: Unauthorized",
      );
    });

    it("Dado erro na leitura do corpo da resposta, Quando sendText falhar, Então ainda lança Error com o status", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error("stream error")),
      });
      vi.stubGlobal("fetch", fetchMock);
      const gateway = new MetaWhatsAppGateway({ token: "tok-123", phoneNumberId: "phone-456" });

      await expect(gateway.sendText("11999990000", "Olá")).rejects.toThrow("WhatsApp API 500:");
    });
  });

  describe("Cenário: normalizar telefone brasileiro", () => {
    it("Dado número já com DDI 55 e 12+ dígitos, Quando normalizar, Então mantém como está", () => {
      expect(normalizeBrazilianPhone("5511999990000")).toBe("5511999990000");
    });

    it("Dado número nacional sem DDI, Quando normalizar, Então adiciona prefixo 55", () => {
      expect(normalizeBrazilianPhone("11999990000")).toBe("5511999990000");
    });

    it("Dado número curto (ex.: começa com 55 mas tem poucos dígitos), Quando normalizar, Então trata como nacional e prefixa 55", () => {
      expect(normalizeBrazilianPhone("5599")).toBe("555599");
    });

    it("Dado número com caracteres não numéricos, Quando normalizar, Então remove-os antes de processar", () => {
      expect(normalizeBrazilianPhone("(11) 99999-0000")).toBe("5511999990000");
    });
  });

  describe("Cenário: montar configuração a partir do ambiente", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("Dado WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID definidos, Quando ler do ambiente, Então retorna a config", () => {
      process.env.WHATSAPP_TOKEN = "tok-abc";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-xyz";

      expect(metaWhatsAppConfigFromEnv()).toEqual({ token: "tok-abc", phoneNumberId: "phone-xyz" });
    });

    it("Dado WHATSAPP_TOKEN ausente, Quando ler do ambiente, Então retorna null", () => {
      delete process.env.WHATSAPP_TOKEN;
      process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-xyz";

      expect(metaWhatsAppConfigFromEnv()).toBeNull();
    });

    it("Dado WHATSAPP_PHONE_NUMBER_ID ausente, Quando ler do ambiente, Então retorna null", () => {
      process.env.WHATSAPP_TOKEN = "tok-abc";
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      expect(metaWhatsAppConfigFromEnv()).toBeNull();
    });
  });
});

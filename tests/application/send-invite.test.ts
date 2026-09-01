import { describe, it, expect, afterEach, vi } from "vitest";
import { appUrlFromEnv } from "@/application/auth/send-invite";

/**
 * O link de convite/reset carrega um segredo de uso único que define a senha da
 * conta — em produção ele não pode sair por `http://` nem apontar para
 * `localhost` por falta de configuração.
 */
describe("Feature: Base pública dos links de convite e reset", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it("Dado ambiente de desenvolvimento sem APP_URL, Quando ler, Então cai no localhost", () => {
    delete process.env.APP_URL;

    expect(appUrlFromEnv()).toBe("http://localhost:3000");
  });

  it("Dado APP_URL configurada fora de produção, Quando ler, Então usa o valor configurado", () => {
    process.env.APP_URL = "http://staging.local:3000";

    expect(appUrlFromEnv()).toBe("http://staging.local:3000");
  });

  it("Dado produção com APP_URL https, Quando ler, Então usa o valor configurado", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_URL = "https://clinica.exemplo.com";

    expect(appUrlFromEnv()).toBe("https://clinica.exemplo.com");
  });

  it("Dado produção sem APP_URL, Quando ler, Então lança em vez de apontar para localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.APP_URL;

    expect(() => appUrlFromEnv()).toThrow(/APP_URL precisa ser uma URL https/);
  });

  it("Dado produção com APP_URL http num host remoto, Quando ler, Então lança (segredo não trafega em claro)", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_URL = "http://clinica.exemplo.com";

    expect(() => appUrlFromEnv()).toThrow(/https/);
  });

  it("Dado produção com APP_URL http em loopback, Quando ler, Então aceita (docker compose local)", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_URL = "http://localhost:3000";

    expect(appUrlFromEnv()).toBe("http://localhost:3000");
  });

  it("Dado produção com APP_URL malformada, Quando ler, Então lança em vez de montar um link quebrado", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.APP_URL = "nao-e-uma-url";

    expect(() => appUrlFromEnv()).toThrow(/https/);
  });
});

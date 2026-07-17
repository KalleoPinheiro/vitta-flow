import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  passwordMatches,
} from "@/lib/auth/session";
import { RateLimiter } from "@/lib/auth/rate-limit";

const SECRET = "test-secret";

describe("Feature: Sessão assinada (HMAC)", () => {
  it("Dado token emitido, Quando verificar com o mesmo segredo, Então válido", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000);

    expect(verifySessionToken(SECRET, token)).toBe(true);
  });

  it("Dado token expirado, Quando verificar, Então inválido", () => {
    const token = createSessionToken(SECRET, Date.now() - 1);

    expect(verifySessionToken(SECRET, token)).toBe(false);
  });

  it("Dado token adulterado (payload ou assinatura), Quando verificar, Então inválido", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000);
    const [payload, signature] = token.split(".");

    expect(verifySessionToken(SECRET, `${Number(payload) + 9999999}.${signature}`)).toBe(false);
    expect(verifySessionToken(SECRET, `${payload}.${"0".repeat(signature.length)}`)).toBe(false);
    expect(verifySessionToken(SECRET, undefined)).toBe(false);
    expect(verifySessionToken(SECRET, "malformed")).toBe(false);
  });

  it("Dado segredo diferente, Quando verificar, Então inválido", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000);

    expect(verifySessionToken("outro-segredo", token)).toBe(false);
  });

  it("Dado senhas iguais/diferentes, Quando comparar em tempo constante, Então correto", () => {
    expect(passwordMatches("s3nh@forte", "s3nh@forte")).toBe(true);
    expect(passwordMatches("s3nh@forte", "s3nh@fortE")).toBe(false);
    expect(passwordMatches("s3nh@forte", "curta")).toBe(false);
  });
});

describe("Feature: Rate limiting de janela fixa", () => {
  it("Dado limite 3/janela, Quando 4ª requisição na janela, Então bloqueia", () => {
    const limiter = new RateLimiter(3, 60_000);
    const now = 1_000_000;

    expect(limiter.allow("ip1", now)).toBe(true);
    expect(limiter.allow("ip1", now + 1)).toBe(true);
    expect(limiter.allow("ip1", now + 2)).toBe(true);
    expect(limiter.allow("ip1", now + 3)).toBe(false);
  });

  it("Dado janela expirada, Quando nova requisição, Então libera novamente", () => {
    const limiter = new RateLimiter(1, 1_000);

    expect(limiter.allow("ip1", 0)).toBe(true);
    expect(limiter.allow("ip1", 500)).toBe(false);
    expect(limiter.allow("ip1", 1_001)).toBe(true);
  });

  it("Dado chaves diferentes, Quando limitar, Então contadores independentes", () => {
    const limiter = new RateLimiter(1, 60_000);

    expect(limiter.allow("ip1", 0)).toBe(true);
    expect(limiter.allow("ip2", 0)).toBe(true);
  });
});

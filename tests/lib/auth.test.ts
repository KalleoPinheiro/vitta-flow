import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  passwordMatches,
} from "@/lib/auth/session";
import { encryptSecret, decryptSecret } from "@/lib/auth/crypto";
import { isEmailAllowed, parseAllowedEmails } from "@/lib/auth/google-oauth";
import { RateLimiter } from "@/lib/auth/rate-limit";

const SECRET = "test-secret";

describe("Feature: Sessão assinada (HMAC)", () => {
  it("Dado token emitido, Quando verificar com o mesmo segredo, Então válido com subject", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000, "maria@clinica.com");

    const session = verifySessionToken(SECRET, token);

    expect(session).not.toBeNull();
    expect(session?.subject).toBe("maria@clinica.com");
  });

  it("Dado token sem subject explícito, Quando verificar, Então subject 'local' e papel 'admin'", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000);

    const session = verifySessionToken(SECRET, token);
    expect(session?.subject).toBe("local");
    expect(session?.role).toBe("admin");
  });

  it("Dado token com papel patient/partner, Quando verificar, Então papel preservado", () => {
    const patientToken = createSessionToken(SECRET, Date.now() + 60_000, "maria@x.com", "patient");
    const partnerToken = createSessionToken(SECRET, Date.now() + 60_000, "dr@x.com", "partner");

    expect(verifySessionToken(SECRET, patientToken)?.role).toBe("patient");
    expect(verifySessionToken(SECRET, partnerToken)?.role).toBe("partner");
  });

  it("Dado token expirado, Quando verificar, Então inválido", () => {
    const token = createSessionToken(SECRET, Date.now() - 1);

    expect(verifySessionToken(SECRET, token)).toBeNull();
  });

  it("Dado token adulterado (payload ou assinatura), Quando verificar, Então inválido", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000);
    const [payload, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ exp: Date.now() + 9_999_999, sub: "hacker" }),
    ).toString("base64url");

    expect(verifySessionToken(SECRET, `${forgedPayload}.${signature}`)).toBeNull();
    expect(verifySessionToken(SECRET, `${payload}.${"0".repeat(signature.length)}`)).toBeNull();
    expect(verifySessionToken(SECRET, undefined)).toBeNull();
    expect(verifySessionToken(SECRET, "malformed")).toBeNull();
  });

  it("Dado segredo diferente, Quando verificar, Então inválido", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000);

    expect(verifySessionToken("outro-segredo", token)).toBeNull();
  });

  it("Dado senhas iguais/diferentes, Quando comparar em tempo constante, Então correto", () => {
    expect(passwordMatches("s3nh@forte", "s3nh@forte")).toBe(true);
    expect(passwordMatches("s3nh@forte", "s3nh@fortE")).toBe(false);
    expect(passwordMatches("s3nh@forte", "curta")).toBe(false);
  });
});

describe("Feature: Criptografia de segredos em repouso (AES-256-GCM)", () => {
  it("Dado segredo cifrado, Quando decifrar com a mesma chave, Então texto original", () => {
    const encrypted = encryptSecret("refresh-token-google-1//abc", SECRET);

    expect(encrypted).not.toContain("refresh-token");
    expect(decryptSecret(encrypted, SECRET)).toBe("refresh-token-google-1//abc");
  });

  it("Dado chave errada ou dado adulterado, Quando decifrar, Então lança erro", () => {
    const encrypted = encryptSecret("valor", SECRET);

    expect(() => decryptSecret(encrypted, "outra-chave")).toThrow();
    expect(() => decryptSecret(`${encrypted.slice(0, -4)}AAAA`, SECRET)).toThrow();
  });

  it("Dado mesmo texto cifrado duas vezes, Quando comparar, Então saídas diferentes (IV aleatório)", () => {
    expect(encryptSecret("x", SECRET)).not.toBe(encryptSecret("x", SECRET));
  });
});

describe("Feature: Allowlist de emails do login Google", () => {
  it("Dado lista com espaços e maiúsculas, Quando parsear, Então normaliza", () => {
    expect(parseAllowedEmails(" Ana@Clinica.com , joao@x.com ,")).toEqual([
      "ana@clinica.com",
      "joao@x.com",
    ]);
    expect(parseAllowedEmails(undefined)).toEqual([]);
  });

  it("Dado email na lista (qualquer caixa), Quando checar, Então permitido; fora dela, negado", () => {
    const allowed = ["ana@clinica.com"];

    expect(isEmailAllowed("ANA@clinica.com", allowed)).toBe(true);
    expect(isEmailAllowed("intruso@gmail.com", allowed)).toBe(false);
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

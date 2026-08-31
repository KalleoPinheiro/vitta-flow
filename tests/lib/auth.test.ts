import { describe, it, expect, afterEach } from "vitest";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import {
  createSessionToken,
  verifySessionToken,
  passwordMatches,
} from "@/lib/auth/session";
import { encryptSecret, decryptSecret } from "@/lib/auth/crypto";
import {
  isEmailAllowed,
  parseAllowedEmails,
  googleOAuthConfigFromEnv,
} from "@/lib/auth/google-oauth";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const SECRET = "test-secret";

/**
 * Reproduz `encryptSecret` como era ANTES de `authTagLength` ser explícito, para que o
 * teste de compatibilidade exercite um ciphertext realmente legado — e não a saída do
 * helper já corrigido. Único motivo para existir uma cifragem local neste arquivo.
 */
function encryptSecretPreAuthTagLength(plaintext: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

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

  it("Dado token emitido sem clinicId explícito, Quando verificar, Então claim clinicId é null (papel de sistema)", () => {
    const token = createSessionToken(SECRET, Date.now() + 60_000, "maria@clinica.com");

    const session = verifySessionToken(SECRET, token);

    expect(session?.clinicId).toBeNull();
  });

  it("Dado token emitido com clinicId, Quando verificar, Então claim clinicId preservado", () => {
    const token = createSessionToken(
      SECRET,
      Date.now() + 60_000,
      "maria@clinica.com",
      "admin",
      "clinic-a",
    );

    const session = verifySessionToken(SECRET, token);

    expect(session?.clinicId).toBe("clinic-a");
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

describe("Feature: Criptografia de segredos — payload malformado", () => {
  it("Dado payload cifrado sem as 3 partes esperadas, Quando decifrar, Então lança erro de formato", () => {
    expect(() => decryptSecret("apenas-uma-parte", SECRET)).toThrow(
      "Segredo cifrado em formato inválido",
    );
    expect(() => decryptSecret("iv.tag", SECRET)).toThrow(
      "Segredo cifrado em formato inválido",
    );
  });

  it("Dado tag de autenticação truncada, Quando decifrar, Então rejeita como formato inválido (não como falha de auth)", () => {
    const encrypted = encryptSecret("valor", SECRET);
    const [iv, tag, data] = encrypted.split(".");
    const truncated = Buffer.from(tag, "base64url").subarray(0, 4).toString("base64url");

    // GCM aceita tags de 4/8/12..16 bytes por padrão — truncar enfraquece a
    // autenticação. O tamanho é fixado em 16 bytes, então a rejeição acontece
    // na validação de formato, antes de qualquer tentativa de decifragem.
    expect(() => decryptSecret([iv, truncated, data].join("."), SECRET)).toThrow(
      "Segredo cifrado em formato inválido",
    );
  });

  it("Dado IV de tamanho inesperado, Quando decifrar, Então rejeita como formato inválido", () => {
    const encrypted = encryptSecret("valor", SECRET);
    const [iv, tag, data] = encrypted.split(".");
    const shortIv = Buffer.from(iv, "base64url").subarray(0, 8).toString("base64url");

    expect(() => decryptSecret([shortIv, tag, data].join("."), SECRET)).toThrow(
      "Segredo cifrado em formato inválido",
    );
  });

  it("Dado payload cifrado no formato anterior a authTagLength, Quando decifrar, Então continua funcionando", () => {
    // Compatibilidade retroativa de verdade: cifra reproduzindo o código ANTERIOR
    // (createCipheriv sem authTagLength) e decifra com a implementação atual.
    // Cifrar com `encryptSecret` provaria apenas que o helper novo lê a própria saída.
    const legacy = encryptSecretPreAuthTagLength("refresh-token-legado", SECRET);

    expect(Buffer.from(legacy.split(".")[1], "base64url")).toHaveLength(16);
    expect(decryptSecret(legacy, SECRET)).toBe("refresh-token-legado");
  });
});

describe("Feature: Configuração de OAuth do Google a partir do ambiente", () => {
  const ENV_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APP_URL", "GOOGLE_ALLOWED_EMAILS"] as const;
  const savedEnv: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it("Dado alguma variável de ambiente ausente, Quando googleOAuthConfigFromEnv, Então retorna null", () => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env.GOOGLE_CLIENT_ID = "client-id";

    expect(googleOAuthConfigFromEnv()).toBeNull();
  });

  it("Dado todas as variáveis configuradas, Quando googleOAuthConfigFromEnv, Então monta config com redirectUri normalizada", () => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
    }
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.APP_URL = "https://vitta.exemplo.com/";
    process.env.GOOGLE_ALLOWED_EMAILS = "ana@clinica.com";

    const config = googleOAuthConfigFromEnv();

    expect(config).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "https://vitta.exemplo.com/api/auth/google/callback",
      allowedEmails: ["ana@clinica.com"],
    });
  });
});

describe("Feature: Hash e verificação de senha (scrypt)", () => {
  it("Dado uma senha, Quando hashPassword e verifyPassword, Então valida corretamente e rejeita senha errada", async () => {
    const hash = await hashPassword("s3nh@forte");

    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("s3nh@forte", hash)).toBe(true);
    expect(await verifyPassword("senha-errada", hash)).toBe(false);
  });

  it("Dado hash com formato inválido, Quando verifyPassword, Então retorna false", async () => {
    expect(await verifyPassword("qualquer", "formato-invalido")).toBe(false);
    expect(await verifyPassword("qualquer", "bcrypt$10$salt$hash")).toBe(false);
  });

  it("Dado hash com custo fora do intervalo permitido, Quando verifyPassword, Então retorna false", async () => {
    expect(await verifyPassword("qualquer", "scrypt$500$salt$abcd")).toBe(false);
    expect(await verifyPassword("qualquer", "scrypt$2000000$salt$abcd")).toBe(false);
    expect(await verifyPassword("qualquer", "scrypt$naoenumero$salt$abcd")).toBe(false);
  });

  it("Dado hash com custo não potência de dois, Quando verifyPassword, Então scrypt lança e retorna false", async () => {
    expect(await verifyPassword("qualquer", "scrypt$1030$salt$abcd")).toBe(false);
  });
});

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
/**
 * GCM aceita tags de 4, 8 e 12..16 bytes. Deixar o tamanho implícito permite que um
 * payload adulterado chegue com tag truncada — o que reduz o custo de forjar uma tag
 * válida. Fixar em 16 bytes (o máximo, e o default do Node ao cifrar) mantém todo
 * payload já existente decifrável e rejeita os truncados.
 */
const AUTH_TAG_LENGTH = 16;

const deriveKey = (secret: string): Buffer => createHash("sha256").update(secret).digest();

/** Cifra um segredo (ex.: refresh token do Google) para armazenamento em repouso. */
export function encryptSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(
    ".",
  );
}

export function decryptSecret(payload: string, secret: string): string {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Segredo cifrado em formato inválido");
  }

  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  // Validado antes de decifrar: com tamanhos inesperados o Node ou aceita em silêncio
  // (IV curto) ou falha com erro genérico de autenticação (tag truncada).
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Segredo cifrado em formato inválido");
  }

  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Wrapper null-safe de `encryptSecret` — usado nos campos clínicos que aceitam `null`. */
export function encryptField(value: string | null, secret: string): string | null {
  return value === null ? null : encryptSecret(value, secret);
}

/** Wrapper null-safe de `decryptSecret` — usado nos campos clínicos que aceitam `null`. */
export function decryptField(value: string | null, secret: string): string | null {
  return value === null ? null : decryptSecret(value, secret);
}

/**
 * Detecta, só pelo formato, se um valor já está no formato `iv.tag.ciphertext` produzido
 * por `encryptSecret` — usado pelo script de migração de dado pra pular linhas já cifradas
 * (idempotência) sem precisar do secret pra tentar decifrar cada linha.
 */
export function isEncryptedPayload(value: string): boolean {
  const [ivPart, tagPart, dataPart] = value.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    return false;
  }
  try {
    const iv = Buffer.from(ivPart, "base64url");
    const tag = Buffer.from(tagPart, "base64url");
    const data = Buffer.from(dataPart, "base64url");
    return (
      iv.length === IV_LENGTH &&
      tag.length === AUTH_TAG_LENGTH &&
      data.length > 0 &&
      iv.toString("base64url") === ivPart &&
      tag.toString("base64url") === tagPart &&
      data.toString("base64url") === dataPart
    );
  } catch {
    return false;
  }
}

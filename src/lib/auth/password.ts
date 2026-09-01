import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_COST = 16384;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

const scryptAsync = (password: string, salt: string, cost: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: cost }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });

/**
 * Hash sentinela de conta que ainda não definiu senha (recém-convidada).
 * Mantém o formato exigido pelo domínio, mas o custo `0` está fora da faixa
 * aceita por `verifyPassword`, então NENHUMA senha satisfaz este hash — a conta
 * só passa a autenticar depois de consumir o convite.
 */
export const UNSET_PASSWORD_HASH = "scrypt$0$sem-senha$sem-senha";

/** Gera hash no formato `scrypt$custo$salt$hash` (hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = await scryptAsync(password, salt, SCRYPT_COST);
  return `scrypt$${SCRYPT_COST}$${salt}$${derived.toString("hex")}`;
}

/** Verificação em tempo constante; formato inválido nunca lança — retorna false. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") {
    return false;
  }
  const cost = Number(parts[1]);
  if (!Number.isInteger(cost) || cost < 1024 || cost > 1_048_576) {
    return false;
  }
  try {
    const derived = await scryptAsync(password, parts[2], cost);
    const expected = Buffer.from(parts[3], "hex");
    return expected.length === derived.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

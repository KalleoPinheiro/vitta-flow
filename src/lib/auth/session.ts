import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "vitta_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Atributos padrão do cookie de sessão (única fonte para login por senha e OAuth). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

const sign = (secret: string, payload: string): string =>
  createHmac("sha256", secret).update(payload).digest("hex");

import { USER_ROLES, type UserRole } from "@/domain/auth/user-role";

export type { UserRole };
export { USER_ROLES };

export interface Session {
  expiresAtMs: number;
  /** Quem está logado: "local" (senha da clínica) ou o email da conta Google. */
  subject: string;
  /** Papel de acesso: admin (equipe), partner (médico parceiro) ou patient (paciente). */
  role: UserRole;
}

export function createSessionToken(
  secret: string,
  expiresAtMs: number,
  subject = "local",
  role: UserRole = "admin",
): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: expiresAtMs, sub: subject, role }),
  ).toString("base64url");
  return `${payload}.${sign(secret, payload)}`;
}

function hasValidSignature(secret: string, payload: string, signature: string): boolean {
  const expectedBuffer = Buffer.from(sign(secret, payload));
  const signatureBuffer = Buffer.from(signature);
  return (
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

function parsePayload(payload: string): Session | null {
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
      sub?: unknown;
      role?: unknown;
    };
    if (typeof parsed.exp !== "number" || typeof parsed.sub !== "string") {
      return null;
    }
    if (!USER_ROLES.includes(parsed.role as UserRole)) {
      return null;
    }
    return { expiresAtMs: parsed.exp, subject: parsed.sub, role: parsed.role as UserRole };
  } catch {
    return null;
  }
}

export function verifySessionToken(
  secret: string,
  token: string | undefined,
  nowMs: number = Date.now(),
): Session | null {
  if (!token) {
    return null;
  }
  const separator = token.indexOf(".");
  if (separator <= 0) {
    return null;
  }
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!hasValidSignature(secret, payload, signature)) {
    return null;
  }
  const session = parsePayload(payload);
  return session && session.expiresAtMs > nowMs ? session : null;
}

export interface AuthConfig {
  secret: string;
  /** Senha local; null quando o login por senha está desativado (só Google). */
  password: string | null;
}

export function getAuthConfig(): AuthConfig | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return null;
  }
  return { secret, password: process.env.AUTH_PASSWORD || null };
}

/** Comparação de senha em tempo constante (evita timing attack). */
export function passwordMatches(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

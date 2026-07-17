import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "vitta_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const sign = (secret: string, payload: string): string =>
  createHmac("sha256", secret).update(payload).digest("hex");

export function createSessionToken(secret: string, expiresAtMs: number): string {
  const payload = String(expiresAtMs);
  return `${payload}.${sign(secret, payload)}`;
}

export function verifySessionToken(
  secret: string,
  token: string | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!token) {
    return false;
  }
  const separator = token.indexOf(".");
  if (separator <= 0) {
    return false;
  }
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(secret, payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }
  const expiresAtMs = Number(payload);
  return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
}

export interface AuthConfig {
  password: string;
  secret: string;
}

export function getAuthConfig(): AuthConfig | null {
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) {
    return null;
  }
  return { password, secret };
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

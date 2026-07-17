import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  getAuthConfig,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/session";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { fail } from "@/lib/api-response";

const LOGIN_RATE_LIMIT = new RateLimiter(5, 60_000);

const loginSchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!LOGIN_RATE_LIMIT.allow(ip)) {
    return fail("Muitas tentativas de login, aguarde um minuto", 429);
  }

  const auth = getAuthConfig();
  if (!auth) {
    return fail("Autenticação não configurada no servidor", 503);
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !passwordMatches(auth.password, parsed.data.password)) {
    return fail("Senha incorreta", 401);
  }

  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const response = NextResponse.json({ success: true, data: { ok: true }, error: null });
  response.cookies.set(SESSION_COOKIE, createSessionToken(auth.secret, expiresAtMs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}

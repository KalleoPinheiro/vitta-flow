import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_OAUTH_BASE_SCOPES,
  GOOGLE_OAUTH_CALENDAR_SCOPES,
  OAUTH_STATE_COOKIE,
  googleOAuthConfigFromEnv,
} from "@/lib/auth/google-oauth";
import { createOAuthClient } from "@/lib/auth/google-oauth-client";
import { fail } from "@/lib/api-response";

const STATE_TTL_SECONDS = 600;

export async function GET(request: NextRequest) {
  const config = googleOAuthConfigFromEnv();
  if (!config) {
    return fail(
      "Login com Google não configurado (GOOGLE_CLIENT_ID/SECRET, APP_URL, GOOGLE_ALLOWED_EMAILS)",
      503,
    );
  }

  // Minimização (LGPD): pacientes/parceiros concedem apenas identificação.
  // O escopo de agenda (+ consent p/ refresh token) só é pedido quando a
  // equipe conecta explicitamente o Google Agenda da clínica.
  const wantsCalendar = request.nextUrl.searchParams.get("connect") === "calendar";
  const state = randomBytes(16).toString("hex");
  const authUrl = createOAuthClient(config).generateAuthUrl({
    access_type: wantsCalendar ? "offline" : "online",
    prompt: wantsCalendar ? "consent" : undefined,
    scope: wantsCalendar ? GOOGLE_OAUTH_CALENDAR_SCOPES : GOOGLE_OAUTH_BASE_SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return response;
}

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  CALENDAR_OAUTH_STATE_COOKIE,
  GOOGLE_CALENDAR_SCOPES,
  googleCalendarOAuthConfigFromEnv,
} from "@/lib/auth/google-calendar-oauth";
import { createOAuthClient } from "@/lib/auth/google-oauth-client";
import { requireStaffSession } from "@/lib/auth/require-session";
import { fail } from "@/lib/api-response";

const STATE_TTL_SECONDS = 600;

/**
 * Início da conexão do Google Agenda. É uma integração, não um login: exige
 * uma sessão nativa já autenticada e nunca cria nem altera sessão. O escopo
 * pedido é só o de eventos de calendário.
 */
export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  const config = googleCalendarOAuthConfigFromEnv();
  if (!config) {
    return fail(
      "Integração com Google Agenda não configurada (GOOGLE_CLIENT_ID/SECRET, APP_URL)",
      503,
    );
  }

  const state = randomBytes(16).toString("hex");
  // `offline` + `consent` são o que garantem o refresh token: sem ele a
  // credencial morre em uma hora e a sincronização para sozinha.
  const authUrl = createOAuthClient(config).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(CALENDAR_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return response;
}

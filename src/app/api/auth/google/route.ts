import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_SCOPES,
  OAUTH_STATE_COOKIE,
  googleOAuthConfigFromEnv,
} from "@/lib/auth/google-oauth";
import { createOAuthClient } from "@/lib/auth/google-oauth-client";
import { fail } from "@/lib/api-response";

const STATE_TTL_SECONDS = 600;

export async function GET() {
  const config = googleOAuthConfigFromEnv();
  if (!config) {
    return fail(
      "Login com Google não configurado (GOOGLE_CLIENT_ID/SECRET, APP_URL, GOOGLE_ALLOWED_EMAILS)",
      503,
    );
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = createOAuthClient(config).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
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

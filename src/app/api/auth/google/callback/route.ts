import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import {
  OAUTH_STATE_COOKIE,
  googleOAuthConfigFromEnv,
  type GoogleOAuthConfig,
} from "@/lib/auth/google-oauth";
import { createOAuthClient } from "@/lib/auth/google-oauth-client";
import { ResolveUserRole } from "@/application/auth/resolve-user-role";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  getAuthConfig,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { encryptSecret } from "@/lib/auth/crypto";
import { getRepositories } from "@/infrastructure/container";

/** Base pública p/ redirects: APP_URL (a URL interna do container não é acessível ao navegador). */
const publicBaseUrl = (request: NextRequest): string => process.env.APP_URL ?? request.url;

function loginErrorRedirect(request: NextRequest, message: string): NextResponse {
  const url = new URL("/login", publicBaseUrl(request));
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

interface GoogleIdentity {
  email: string;
  refreshToken: string | null;
}

async function exchangeCode(config: GoogleOAuthConfig, code: string): Promise<GoogleIdentity | null> {
  const client = createOAuthClient(config);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const userinfo = await google.oauth2({ version: "v2", auth: client }).userinfo.get();
  const email = userinfo.data.email?.toLowerCase();
  if (!email) {
    return null;
  }
  return { email, refreshToken: tokens.refresh_token ?? null };
}

type GoogleAccounts = Awaited<ReturnType<typeof getRepositories>>["googleAccounts"];

async function persistRefreshToken(
  googleAccounts: GoogleAccounts,
  email: string,
  refreshToken: string | null,
  secret: string,
): Promise<void> {
  if (!refreshToken) {
    return;
  }
  await googleAccounts.save({
    email,
    encryptedRefreshToken: encryptSecret(refreshToken, secret),
    connectedAt: new Date(),
  });
}

/** Valida code + state anti-CSRF do callback; retorna o code ou null. */
function extractValidatedCode(request: NextRequest): string | null {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return null;
  }
  return code;
}

export async function GET(request: NextRequest) {
  const config = googleOAuthConfigFromEnv();
  const auth = getAuthConfig();
  if (!config || !auth) {
    return loginErrorRedirect(request, "Login com Google não configurado");
  }

  const code = extractValidatedCode(request);
  if (!code) {
    return loginErrorRedirect(request, "Fluxo de login inválido, tente novamente");
  }

  try {
    const identity = await exchangeCode(config, code);
    if (!identity) {
      return loginErrorRedirect(request, "Não foi possível obter o email da conta Google");
    }

    const { patients, partners, googleAccounts } = await getRepositories();
    const role = await new ResolveUserRole(patients, partners).execute({
      email: identity.email,
      adminEmails: config.allowedEmails,
    });
    if (!role) {
      return loginErrorRedirect(request, `Conta ${identity.email} não autorizada nesta clínica`);
    }

    // Credencial do Calendar pertence à clínica: só persiste quando quem loga é da equipe.
    if (role === "admin") {
      await persistRefreshToken(googleAccounts, identity.email, identity.refreshToken, auth.secret);
    }

    const destination = role === "admin" ? "/" : "/portal";
    const response = NextResponse.redirect(new URL(destination, publicBaseUrl(request)));
    response.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(auth.secret, Date.now() + SESSION_TTL_MS, identity.email, role),
      sessionCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("Login Google: falha no callback OAuth", error);
    return loginErrorRedirect(request, "Falha ao autenticar com o Google");
  }
}

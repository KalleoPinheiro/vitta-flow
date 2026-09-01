import { NextResponse, type NextRequest } from "next/server";
import {
  CALENDAR_OAUTH_STATE_COOKIE,
  googleCalendarOAuthConfigFromEnv,
} from "@/lib/auth/google-calendar-oauth";
import { createOAuthClient } from "@/lib/auth/google-oauth-client";
import { requireStaffSession } from "@/lib/auth/require-session";
import { encryptSecret } from "@/lib/auth/crypto";
import { getRepositories } from "@/infrastructure/container";
import { getAuthConfig } from "@/lib/auth/session";
import { fail } from "@/lib/api-response";

/** Base pública p/ redirects: a URL interna do container não é acessível ao navegador. */
const publicBaseUrl = (request: NextRequest): string => process.env.APP_URL ?? request.url;

function clearState(response: NextResponse): NextResponse {
  response.cookies.set(CALENDAR_OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

/** Valida `code` + `state` anti-CSRF; devolve o code ou null. */
function extractValidatedCode(request: NextRequest): string | null {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(CALENDAR_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return null;
  }
  return code;
}

/**
 * Conclusão da conexão do Google Agenda. Guarda apenas o refresh token cifrado
 * sob o `subject` da sessão que iniciou o fluxo. **Nunca** emite, renova ou
 * troca cookie de sessão: quem já está autenticado continua exatamente com a
 * mesma sessão que tinha (AUTH-18).
 */
export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  const config = googleCalendarOAuthConfigFromEnv();
  const auth = getAuthConfig();
  if (!config || !auth) {
    return fail("Integração com Google Agenda não configurada", 503);
  }

  const code = extractValidatedCode(request);
  if (!code) {
    return clearState(fail("Fluxo de conexão inválido, tente novamente", 400));
  }

  try {
    const client = createOAuthClient(config);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return clearState(
        fail(
          "O Google não devolveu credencial de longa duração — revogue o acesso do VittaFlow na sua conta Google e conecte de novo",
          400,
        ),
      );
    }

    // Titular da credencial é a sessão nativa, não uma identidade do Google.
    const { googleAccounts } = await getRepositories({ clinicId: guard.session?.clinicId ?? null });
    await googleAccounts.save({
      email: guard.session?.subject ?? "sessao-aberta",
      encryptedRefreshToken: encryptSecret(tokens.refresh_token, auth.secret),
      connectedAt: new Date(),
    });

    return clearState(
      NextResponse.redirect(new URL("/configuracoes?calendar=conectado", publicBaseUrl(request))),
    );
  } catch (error) {
    console.error("Google Agenda: falha ao concluir a conexão", error);
    return clearState(fail("Falha ao conectar o Google Agenda", 502));
  }
}

export interface GoogleCalendarOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Escopo único: gerenciar eventos da agenda. Sem `openid`/`userinfo.email` —
 * o Google deixou de identificar quem é a pessoa (isso é papel da sessão
 * nativa que iniciou o fluxo), então pedir identidade seria coleta sem
 * finalidade (minimização, LGPD).
 */
export const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

/** Cookie de estado anti-CSRF do fluxo de conexão da agenda. */
export const CALENDAR_OAUTH_STATE_COOKIE = "vitta_calendar_oauth_state";

export const CALENDAR_CALLBACK_PATH = "/api/integrations/google-calendar/callback";

/**
 * Config do OAuth de agenda. Diferente do login por Google que existia antes,
 * NÃO há allowlist de e-mails: quem pode conectar já foi decidido pela sessão
 * nativa (papel de equipe), não por variável de ambiente do deploy.
 */
export function googleCalendarOAuthConfigFromEnv(): GoogleCalendarOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;
  if (!clientId || !clientSecret || !appUrl) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}${CALENDAR_CALLBACK_PATH}`,
  };
}

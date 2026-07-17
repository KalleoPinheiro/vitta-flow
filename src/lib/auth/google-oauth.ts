export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedEmails: string[];
}

/** Escopo mínimo (LGPD): identificação apenas — usado por pacientes e parceiros. */
export const GOOGLE_OAUTH_BASE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Escopo adicional pedido SOMENTE quando a equipe conecta a agenda da clínica. */
export const GOOGLE_OAUTH_CALENDAR_SCOPES = [
  ...GOOGLE_OAUTH_BASE_SCOPES,
  "https://www.googleapis.com/auth/calendar.events",
];

export const OAUTH_STATE_COOKIE = "vitta_oauth_state";

export function parseAllowedEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function isEmailAllowed(email: string, allowedEmails: string[]): boolean {
  return allowedEmails.includes(email.trim().toLowerCase());
}

/**
 * Config do login com Google. Exige allowlist de emails — sem ela, qualquer
 * conta Google teria acesso ao prontuário, então o login Google fica desativado.
 * (Sem dependência de googleapis: este módulo também roda no proxy.)
 */
export function googleOAuthConfigFromEnv(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL;
  const allowedEmails = parseAllowedEmails(process.env.GOOGLE_ALLOWED_EMAILS);
  if (!clientId || !clientSecret || !appUrl || allowedEmails.length === 0) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`,
    allowedEmails,
  };
}

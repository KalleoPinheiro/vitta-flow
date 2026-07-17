import { getAuthConfig } from "@/lib/auth/session";
import { googleOAuthConfigFromEnv } from "@/lib/auth/google-oauth";
import { ok } from "@/lib/api-response";

/** Informa à tela de login quais métodos estão habilitados (rota pública, sem dados sensíveis). */
export async function GET() {
  const auth = getAuthConfig();
  return ok({
    password: Boolean(auth?.password),
    google: Boolean(googleOAuthConfigFromEnv()),
  });
}
